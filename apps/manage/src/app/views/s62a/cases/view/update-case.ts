import type { Request, Response } from 'express';
import type { SaveDataFn } from '@planning-inspectorate/dynamic-forms';
import type { ManageService } from '#service';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { S62aCaseUpdateMapper, type UpdateCaseAnswers } from './s62a-update-case-mapper.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { s62aCaseToViewModel } from './view-model.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { S62A_VIEW_SELECT_INCLUDE } from './constants.ts';
import { type AuditService, type AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { resolveFieldValues, getFieldDisplayName } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import type { Logger } from 'pino';
import { resolveAuditAction } from '@pins/crowndev-lib/audit/actions.ts';
import { loadEnvironmentConfig, ENVIRONMENT_NAME } from '../../../../config.js';
import type { S62aCaseViewModel } from './view-model.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

/** * Long-text fields that render with expandable old/new value details * instead of inline audit text. */
const LONG_AUDIT_FIELDS = new Set(['description', 'costsApplicationsComment']);

/**
 * Scalar fields that should be audited when updated.
 * Only these fields will produce audit entries in recordAuditEntries.
 */
const AUDITABLE_SCALAR_FIELDS = new Set([
	// Directly editable scalar fields
	'description',
	'siteArea',
	'lpaReference',
	'agentOrganisationName',
	'healthAndSafetyIssue',
	'hearingVenue',
	'inquiryVenue',

	// Reference table fields (IDs that map to display names)
	'typeId',
	'lpaId',
	'secondaryLpaId',
	'decisionOutcomeId',
	'subCategoryId',
	'procedureId',
	'statusId',
	'stageId',

	// Boolean fields
	'hasSecondaryLpa',
	'containsDistressingContent',
	'hasAgent',
	'nationallyImportant',
	'isGreenBelt',
	'siteIsVisibleFromPublicLand',
	'environmentalImpactAssessment',
	'developmentPlan',
	'rightOfWay',
	'eiaScreening',
	'eiaScreeningOutcome',
	'hasApplicationFee',
	'eligibleForFeeRefund',
	'cilLiable',
	'bngExempt',
	'hasCostsApplications',
	'costsApplicationsComment',
	// Monetary fields
	'cilAmount',
	'applicationFee',
	'applicationFeeRefundAmount'
]);

/**
 * Save handler for S62A Case updates.
 * Takes the raw form answers, maps them to Prisma format, and updates the database.
 */
export function buildS62aUpdateCase(service: ManageService, clearAnswer = false): SaveDataFn {
	return async ({ req, res, data }: { req: Request; res: Response; data: { answers?: UpdateCaseAnswers } }) => {
		const { db, logger, audit } = service;
		const id = getStringParam(req.params, 'id');
		const userId = req.session?.account?.localAccountId;

		logger.info({ id }, 'S62A case update initiated');
		const previousValues: Record<string, unknown> = {};

		const answers = data?.answers || {};

		const updatedFieldNames = Object.keys(answers);
		const answersSnapshot = { ...answers };

		if (Object.keys(answers).length === 0) {
			logger.info({ id }, 'No case updates to apply');
			return;
		}

		// Wipes answers that were indentified as being removed
		if (clearAnswer) {
			Object.keys(answers).forEach((key) => {
				Object.assign(answers, { [key]: null });
			});
		}

		let updateSucceeded = false;

		try {
			const s62aCase = await db.s62aCase.findUnique({
				include: S62A_VIEW_SELECT_INCLUDE,
				where: { id }
			});

			if (s62aCase === null) {
				return notFoundHandler(req, res);
			}

			const viewModel = s62aCaseToViewModel(s62aCase);

			const mapper = new S62aCaseUpdateMapper(answers, viewModel);
			const updateInput = mapper.generateUpdateInput();

			if (Object.keys(updateInput).length === 0) {
				logger.info({ id }, 'No valid database fields mapped for update');
				return;
			}

			await db.s62aCase.update({
				where: { id },
				data: {
					...updateInput,
					updatedDate: new Date()
				}
			});

			for (const fieldName of updatedFieldNames) {
				if (AUDITABLE_SCALAR_FIELDS.has(fieldName)) {
					previousValues[fieldName] = viewModel[fieldName as keyof S62aCaseViewModel];
				}
			}

			updateSucceeded = true;

			addSessionData(req, id, { updated: true });

			logger.info({ id }, 'S62A case updated successfully');
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating S62A case',
				logParams: { id }
			});
		}

		if (updateSucceeded && service.isAuditLive !== false) {
			await recordAuditEntries(audit, id, userId, previousValues, answersSnapshot, updatedFieldNames, logger, res);
		}
	};
}

async function recordAuditEntries(
	audit: AuditService,
	caseId: string,
	userId: string | undefined,
	previousValues: Record<string, unknown>,
	answersSnapshot: Record<string, unknown>,
	updatedFieldNames: string[],
	logger: Logger,
	res: Response
): Promise<void> {
	// Bail out early if userId is missing — audit.recordMany requires a userId for every entry
	// and will throw/log when missing. This avoids noisy error logs and wasted work.
	const auditUserId = userId || 'Unknown-user';
	if (!userId) {
		logger.warn({ caseId, updatedFieldNames }, 'Recording audit with unknown-user: no userId available');
	}
	try {
		const allAuditEntries: AuditEntry[] = [];

		// ── Scalar fields ────────────────────────────────────────────────
		for (const fieldName of updatedFieldNames) {
			// Only audit fields in the auditable set
			if (!AUDITABLE_SCALAR_FIELDS.has(fieldName)) {
				continue;
			}

			let envConfig: string;
			try {
				envConfig = loadEnvironmentConfig();
			} catch {
				envConfig = '';
			}

			const { oldValue, newValue } = resolveFieldValues(fieldName, previousValues, answersSnapshot[fieldName], {
				environmentConfig: envConfig,
				environmentName: ENVIRONMENT_NAME
			});

			if (oldValue === newValue) {
				continue;
			}

			const action = resolveAuditAction(oldValue, newValue, LONG_AUDIT_FIELDS.has(fieldName));

			allAuditEntries.push({
				caseId,
				action,
				userId: auditUserId,
				metadata: {
					fieldName: getFieldDisplayName(fieldName, res.locals.fieldDisplayNames as Record<string, string>),
					oldValue,
					newValue
				}
			});
		}

		await audit.recordMany(allAuditEntries, CASE_DATA_MODEL.S62A);
	} catch (error: unknown) {
		// Audit failures should never block the user's operation.
		// The case data has already been saved successfully above.
		logger.error({ error, caseId }, 'Failed to record audit events');
	}
}

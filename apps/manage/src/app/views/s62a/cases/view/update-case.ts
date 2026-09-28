import type { Request, Response } from 'express';
import type { SaveDataFn } from '@planning-inspectorate/dynamic-forms';
import type { ManageService } from '#service';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { S62aCaseUpdateMapper, type UpdateCaseAnswers } from './s62a-update-case-mapper.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { s62aCaseToViewModel } from './view-model.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { S62A_VIEW_SELECT_INCLUDE } from './constants.ts';
import type { AuditService } from '@pins/crowndev-lib/audit/index.ts';
import { resolveCaseUpdateAudits } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import type { Logger } from 'pino';
import { loadEnvironmentConfig, ENVIRONMENT_NAME } from '../../../../config.js';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { isPreApplicationAdviceGiven } from '../util/pre-application.ts';
import { FOLDER_SYNC_RESULT, syncPreApplicationAdviceFolder } from '../util/folders.ts';
import {
	AUDITABLE_SCALAR_FIELDS,
	LONG_AUDIT_FIELDS,
	S62A_AUDIT_FIELD_LABELS,
	createS62aFieldResolvers
} from '../audit/field-resolvers.ts';
import { S62A_GROUPED_FIELDS } from '../audit/grouped-fields.ts';

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
		// The case as it was before this save, used to work out what changed
		let previousCase: Record<string, unknown> = {};

		const answers = data?.answers || {};

		const updatedFieldNames = Object.keys(answers);

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

		// Snapshot taken after clearing, so 'Remove and save' is audited as a removal.
		// Taken before the mapper runs, in case the mapper changes the answers.
		const answersSnapshot = { ...answers };

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

			await db.$transaction(async ($tx) => {
				await $tx.s62aCase.update({
					where: { id },
					data: {
						...updateInput,
						updatedDate: new Date()
					}
				});

				// The advice answer decides whether the case has a pre-application advice folder:
				// Yes creates or restores it, No soft-deletes it.
				if (
					viewModel.applicationPhaseId === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION &&
					answers.preApplicationAdviceId !== undefined
				) {
					const change = await syncPreApplicationAdviceFolder(
						id,
						isPreApplicationAdviceGiven(answers.preApplicationAdviceId),
						$tx
					);
					if (change !== FOLDER_SYNC_RESULT.UNCHANGED) {
						logger.info({ id, change }, 'synced pre-application advice folder');
					}
				}
			});

			// The whole case, not just the fields in this save: some entries need
			// fields that didn't change, e.g. the rest of a multi-field question, or
			// the linked pre-application case's reference. It's the view model we've
			// already loaded for the save, so this costs nothing extra.
			previousCase = viewModel as unknown as Record<string, unknown>;

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
			await recordAuditEntries(audit, logger, res, {
				caseId: id,
				userId,
				previousCase,
				answers: answersSnapshot,
				updatedFieldNames
			});
		}
	};
}

/**
 * Records the save in the case history. The entries are worked out in lib
 * (resolveCaseUpdateAudits); this only supplies the S62A configuration.
 * Audit failures are logged and never block the user's save.
 */
async function recordAuditEntries(
	audit: AuditService,
	logger: Logger,
	res: Response,
	{
		caseId,
		userId,
		previousCase,
		answers,
		updatedFieldNames
	}: {
		caseId: string;
		userId: string | undefined;
		previousCase: Record<string, unknown>;
		answers: Record<string, unknown>;
		updatedFieldNames: string[];
	}
): Promise<void> {
	// Every entry needs a user, so fall back to the unknown user rather than losing the entries
	const auditUserId = getAuditUserId(userId);
	if (!userId) {
		logger.warn({ caseId, updatedFieldNames }, 'Recording audit with unknown-user: no userId available');
	}

	try {
		let envConfig: string;
		try {
			envConfig = loadEnvironmentConfig();
		} catch {
			envConfig = '';
		}

		const entries = resolveCaseUpdateAudits({
			caseId,
			userId: auditUserId,
			updatedFieldNames,
			previousCase,
			answers,
			config: {
				// Set by the journey middleware, from the linkable pre-application cases it loads
				fieldResolvers: createS62aFieldResolvers(
					res.locals.preApplicationCaseReferences as ReadonlyMap<string, string> | undefined
				),
				auditableFields: AUDITABLE_SCALAR_FIELDS,
				longFields: LONG_AUDIT_FIELDS,
				groupedFields: S62A_GROUPED_FIELDS,
				labels: S62A_AUDIT_FIELD_LABELS
			},
			questionLabels: res.locals.fieldDisplayNames as Record<string, string> | undefined,
			context: {
				environmentConfig: envConfig,
				environmentName: ENVIRONMENT_NAME,
				userDisplayNameMap: res.locals.userDisplayNameMap as Map<string, string> | undefined
			}
		});

		if (entries.length > 0) {
			await audit.recordMany(entries, CASE_DATA_MODEL.S62A);
		}
	} catch (error: unknown) {
		// Audit failures should never block the user's operation.
		// The case data has already been saved successfully above.
		logger.error({ error, caseId }, 'Failed to record audit events');
	}
}

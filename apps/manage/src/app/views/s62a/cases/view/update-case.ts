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
import { type AuditService, type AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { resolveFieldValues, getFieldDisplayName } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import type { Logger } from 'pino';
import { resolveAuditAction } from '@pins/crowndev-lib/audit/actions.ts';
import { loadEnvironmentConfig, ENVIRONMENT_NAME } from '../../../../config.js';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { isPreApplicationAdviceGiven } from '../util/pre-application.ts';
import { FOLDER_SYNC_RESULT, syncPreApplicationAdviceFolder } from '../util/folders.ts';
import {
	AUDITABLE_SCALAR_FIELDS,
	LONG_AUDIT_FIELDS,
	S62A_AUDIT_FIELD_LABELS,
	S62A_FIELD_RESOLVERS
} from '../audit/field-resolvers.ts';
import { S62A_LIST_RESOLVERS, toListItems } from '../audit/list-resolvers.ts';
import { resolveGroupedFieldChanges } from '../audit/grouped-fields.ts';

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
			const referenceNames = await loadAuditReferenceNames(db, answersSnapshot, logger);
			await recordAuditEntries(
				audit,
				id,
				userId,
				previousCase,
				answersSnapshot,
				updatedFieldNames,
				logger,
				res,
				referenceNames
			);
		}
	};
}

/**
 * Looks up display names the audit needs that aren't static reference data.
 *
 * For now that's the reference of a newly linked pre-application case: the
 * answer is the case's ID, and the history should show its reference. Only
 * queried when that field is in the save. A failed lookup is logged and the
 * audit falls back to the ID, so it can't block the save.
 */
async function loadAuditReferenceNames(
	db: ManageService['db'],
	answers: Record<string, unknown>,
	logger: Logger
): Promise<Record<string, Map<string, string>>> {
	const referenceNames: Record<string, Map<string, string>> = {};

	const preApplicationCaseId = answers.preApplicationCaseId;
	if (typeof preApplicationCaseId === 'string' && preApplicationCaseId !== '') {
		try {
			const linkedCase = await db.s62aCase.findUnique({
				where: { id: preApplicationCaseId },
				select: { reference: true }
			});

			if (linkedCase?.reference) {
				referenceNames.preApplicationCaseId = new Map([[preApplicationCaseId, linkedCase.reference]]);
			}
		} catch (error: unknown) {
			logger.warn(
				{ error, preApplicationCaseId },
				'Could not look up the pre-application case reference for the audit'
			);
		}
	}

	return referenceNames;
}

async function recordAuditEntries(
	audit: AuditService,
	caseId: string,
	userId: string | undefined,
	previousCase: Record<string, unknown>,
	answersSnapshot: Record<string, unknown>,
	updatedFieldNames: string[],
	logger: Logger,
	res: Response,
	referenceNames: Record<string, Map<string, string>> = {}
): Promise<void> {
	// audit.recordMany needs a userId for every entry, so fall back to a placeholder
	// rather than losing the audit entries altogether.
	const auditUserId = userId || 'Unknown-user';
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

		const context = {
			environmentConfig: envConfig,
			environmentName: ENVIRONMENT_NAME,
			userDisplayNameMap: res.locals.userDisplayNameMap as Map<string, string> | undefined,
			referenceNames
		};

		// Audit labels take priority over question titles
		const fieldLabels: Record<string, string> = {
			...(res.locals.fieldDisplayNames as Record<string, string> | undefined),
			...S62A_AUDIT_FIELD_LABELS
		};

		const allAuditEntries: AuditEntry[] = [];

		// ── Scalar fields ────────────────────────────────────────────────
		for (const fieldName of updatedFieldNames) {
			// Only audit fields in the auditable set
			if (!AUDITABLE_SCALAR_FIELDS.has(fieldName)) {
				continue;
			}

			const { oldValue, newValue } = resolveFieldValues(
				S62A_FIELD_RESOLVERS,
				fieldName,
				previousCase,
				answersSnapshot[fieldName],
				context
			);

			if (oldValue === newValue) {
				continue;
			}

			const action = resolveAuditAction(oldValue, newValue, LONG_AUDIT_FIELDS.has(fieldName));

			allAuditEntries.push({
				caseId,
				action,
				userId: auditUserId,
				metadata: {
					fieldName: getFieldDisplayName(fieldName, fieldLabels),
					oldValue,
					newValue
				}
			});
		}

		// ── Multi-field inputs ───────────────────────────────────────────
		// One entry per question, not one per input
		for (const { fieldName, oldValue, newValue } of resolveGroupedFieldChanges(
			updatedFieldNames,
			previousCase,
			answersSnapshot
		)) {
			allAuditEntries.push({
				caseId,
				action: resolveAuditAction(oldValue, newValue),
				userId: auditUserId,
				metadata: {
					fieldName: getFieldDisplayName(fieldName, fieldLabels),
					oldValue,
					newValue
				}
			});
		}

		// ── Manage lists ─────────────────────────────────────────────────
		for (const fieldName of updatedFieldNames) {
			const listResolver = S62A_LIST_RESOLVERS[fieldName];
			if (!listResolver) {
				continue;
			}

			allAuditEntries.push(
				...listResolver.resolve({
					caseId,
					userId: auditUserId,
					oldItems: toListItems(previousCase[fieldName]),
					newItems: toListItems(answersSnapshot[fieldName]),
					previousCase,
					answers: answersSnapshot,
					context
				})
			);
		}

		await audit.recordMany(allAuditEntries, CASE_DATA_MODEL.S62A);
	} catch (error: unknown) {
		// Audit failures should never block the user's operation.
		// The case data has already been saved successfully above.
		logger.error({ error, caseId }, 'Failed to record audit events');
	}
}

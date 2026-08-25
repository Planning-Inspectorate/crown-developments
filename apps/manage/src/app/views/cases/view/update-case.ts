import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification,
	sendLpaQuestionnaireSentNotification
} from './notification.js';
import { fireAndForget } from '@pins/crowndev-lib/util/retry.ts';
import { CLEARABLE_SAVE_KEYS, editsToDatabaseUpdates, crownDevelopmentToViewModel } from './view-model.ts';
import { crownEditsToDatabaseUpdates } from './crown-edits.ts';
import { FIELD_DISPLAY_NAMES } from './questions.ts';
import { loadEnvironmentConfig, ENVIRONMENT_NAME } from '../../../config.js';
import {
	hasOrganisationWriteEdits,
	buildCaseUpdateWritePlan,
	executeCaseUpdateWritePlan
} from './linked-case-updates.ts';
import {
	CROWN_DEVELOPMENT_VIEW_INCLUDE,
	CROWN_DEVELOPMENT_VIEW_INCLUDE_WITHOUT_ORGS,
	CROWN_DEVELOPMENT_PLANNING_INCLUDE,
	type CrownDevelopmentPayload,
	type CrownDevelopmentPlanningPayload
} from './payload-contracts.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { ManageService } from '#service';
import { BOOLEAN_OPTIONS, type SaveDataFn } from '@planning-inspectorate/dynamic-forms';
import type { Request, Response } from 'express';
import type {
	CrownDevelopmentClearableKey,
	CrownDevelopmentViewModel,
	CrownDevelopmentSaveModel
} from './view-model.ts';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { type AuditService, type AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { resolveFieldValues, getFieldDisplayName } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import type { Logger } from 'pino';
import { resolveAuditAction } from '@pins/crowndev-lib/audit/actions.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

/**
 * Send a notification in the background and update the emailSent flag only on success.
 * This is fire-and-forget - errors are logged but don't block the request.
 */
function sendNotificationAndUpdateFlag(
	notificationPromise: Promise<void>,
	db: PrismaClient,
	caseId: string,
	flagField:
		| 'applicationReceivedDateEmailSent'
		| 'lpaQuestionnaireReceivedEmailSent'
		| 'lpaQuestionnaireSpecialEmailSent'
		| 'notNationallyImportantEmailSent',
	logger: Logger,
	operationName: string
): void {
	const operation = (async () => {
		await notificationPromise;
		// Only update the flag if notification succeeded
		await db.crownDevelopment.update({
			where: { id: caseId },
			data: { [flagField]: true }
		});
		logger.info({ caseId, flagField, operation: operationName }, 'Notification sent and flag updated successfully');
	})();

	fireAndForget(operation, logger, { operation: operationName, caseId });
}

function typedObjectKeys<T extends object>(obj: T): Array<keyof T> {
	return Object.keys(obj) as Array<keyof T>;
}

function typedObjectEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
	return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

function setSaveAnswer<K extends keyof CrownDevelopmentSaveModel>(
	answers: CrownDevelopmentSaveModel,
	key: K,
	value: CrownDevelopmentSaveModel[K]
): void {
	answers[key] = value;
}

function setViewModelAnswer<K extends keyof CrownDevelopmentViewModel>(
	answers: CrownDevelopmentViewModel,
	key: K,
	value: CrownDevelopmentViewModel[K]
): void {
	answers[key] = value;
}

const CLEARABLE_SAVE_KEY_SET = new Set<CrownDevelopmentClearableKey>(CLEARABLE_SAVE_KEYS);

function isClearableSaveKey(key: keyof CrownDevelopmentSaveModel): key is CrownDevelopmentClearableKey {
	return CLEARABLE_SAVE_KEY_SET.has(key as CrownDevelopmentClearableKey);
}

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
	'applicationFeeRefundAmount',
	//address fields
	'siteAddress',
	'agentOrganisationAddress'
]);

/** * Long-text fields that render with expandable old/new value details * instead of inline audit text. */
const LONG_AUDIT_FIELDS = new Set(['description', 'costsApplicationsComment']);

type ErrorWithSummary = Error & { errorSummary: ErrorSummaryItem[] };

function buildSummaryError(message: string, errorSummary: ErrorSummaryItem[]): ErrorWithSummary {
	const error = new Error(message) as ErrorWithSummary;
	error.errorSummary = errorSummary;
	return error;
}

/**
 * Applies updates to a case based on the provided data.
 *
 * @param service - the manage service instance
 * @param clearAnswer - whether to clear the answer before saving
 */
export function buildUpdateCase(service: ManageService, clearAnswer: boolean = false): SaveDataFn {
	return async ({ req, res, data }: { req: Request; res: Response; data: { answers?: CrownDevelopmentSaveModel } }) => {
		const { db, logger, audit } = service;
		const id = getStringParam(req.params, 'id');
		const userId = req.session?.account?.localAccountId;

		logger.info({ id }, 'case update');

		const toSave: CrownDevelopmentSaveModel = data?.answers || {};
		if (clearAnswer) {
			// clear the answer if requested
			typedObjectKeys(toSave).forEach((key) => {
				if (isClearableSaveKey(key)) {
					setSaveAnswer(toSave, key, null);
					return;
				}
				delete toSave[key];
			});
		}
		if (Object.keys(toSave).length === 0) {
			logger.info({ id }, 'no case updates to apply');
			return;
		}

		// Capture the field names and snapshot of answers for audit
		const updatedFieldNames = Object.keys(toSave);
		const answersSnapshot = { ...toSave };

		const fullViewModel = res.locals?.journeyResponse?.answers || {};
		const originalAnswers: Partial<CrownDevelopmentViewModel> = res.locals?.originalAnswers || {};

		customUpdateCaseActions(service, id, toSave, fullViewModel);

		if (toSave.hasAgent === false && fullViewModel.hasAgent === 'yes') {
			addSessionData(req, id, { agentStatusUpdated: true });
		}

		if (toSave.hasAgent === true && fullViewModel.hasAgent === 'no') {
			addSessionData(req, id, { agentStatusUpdated: true });
		}

		if (
			toSave.manageApplicantDetails &&
			toSave.manageApplicantDetails.length > (fullViewModel.manageApplicantDetails?.length ?? 0)
		) {
			addSessionData(req, id, { applicantOrgAdded: true });
		}

		// Capture previous values for auditable fields before the update
		const previousValues: Record<string, unknown> = {};
		let updateSucceeded = false;

		try {
			// Build a deterministic write-plan (no shared nested Organisations writes) and execute it
			// inside a single interactive transaction.
			await db.$transaction(async (tx) => {
				// Only fetch the organisation graph when the edit needs it: organisation/contact writes,
				// or agent removal (hasAgent -> false), which may cascade organisation/contact deletes.
				const includeOrganisations = hasOrganisationWriteEdits(toSave) || toSave.hasAgent === false;
				const crownDevelopment = includeOrganisations
					? await tx.crownDevelopment.findUnique({ where: { id }, include: CROWN_DEVELOPMENT_VIEW_INCLUDE })
					: await tx.crownDevelopment.findUnique({
							where: { id },
							include: CROWN_DEVELOPMENT_VIEW_INCLUDE_WITHOUT_ORGS
						});

				if (!crownDevelopment) {
					throw new Error('Crown Development case not found');
				}

				// Fresh DB view model gives correct relation ids (organisationRelationId / organisationToContactRelationId)
				const dbViewModel = crownDevelopmentToViewModel(crownDevelopment);

				// Capture previous values for auditable fields before making changes
				for (const fieldName of updatedFieldNames) {
					if (AUDITABLE_SCALAR_FIELDS.has(fieldName)) {
						previousValues[fieldName] = dbViewModel[fieldName as keyof CrownDevelopmentViewModel];
					}
				}

				const viewModelForUpdates: CrownDevelopmentViewModel = { ...dbViewModel };
				for (const [key, value] of typedObjectEntries(originalAnswers)) {
					if (viewModelForUpdates[key] === undefined || viewModelForUpdates[key] === null) {
						setViewModelAnswer(viewModelForUpdates, key, value);
					}
				}

				// IMPORTANT: organisations are excluded here because organisation/contact updates are handled
				// separately via the deterministic write plan (see buildCaseUpdateWritePlan/executeCaseUpdateWritePlan).
				// This is the Crown route, so the Crown case-type updater is supplied. When S62A gets its own
				// route, it will pass s62aEditsToDatabaseUpdates instead (ideally sourced from a CaseTypeConfig).
				const updateInput = editsToDatabaseUpdates(toSave, viewModelForUpdates, crownEditsToDatabaseUpdates, {
					includeOrganisations: false
				});
				updateInput.updatedDate = new Date();

				const caseIds = [id];
				if (crownDevelopment.linkedParentId && !updateContainsDeLinkedField(updateInput)) {
					caseIds.push(crownDevelopment.linkedParentId);
				}
				if (crownDevelopment.ChildrenCrownDevelopment?.length > 0 && !updateContainsDeLinkedField(updateInput)) {
					caseIds.push(...crownDevelopment.ChildrenCrownDevelopment.map((child) => child.id));
				}

				let crownDevelopmentsForPlanning: CrownDevelopmentPlanningPayload[] =
					'Organisations' in crownDevelopment ? [crownDevelopment as CrownDevelopmentPayload] : [];

				const shouldDeleteAgentData = toSave.hasAgent === false && dbViewModel.hasAgent === BOOLEAN_OPTIONS.YES;
				if ((hasOrganisationWriteEdits(toSave) || shouldDeleteAgentData) && caseIds.length > 1) {
					crownDevelopmentsForPlanning = await tx.crownDevelopment.findMany({
						where: { id: { in: caseIds } },
						include: CROWN_DEVELOPMENT_PLANNING_INCLUDE
					});
				}

				let sharedSiteAddressId = null;
				if ('siteAddress' in toSave && caseIds.length > 1) {
					if (crownDevelopment.linkedParentId) {
						sharedSiteAddressId = crownDevelopment.ParentCrownDevelopment?.siteAddressId;
						// If parent has no address, fall back to the current child's address
						if (!sharedSiteAddressId) {
							sharedSiteAddressId = crownDevelopment.siteAddressId;
						}
					} else {
						sharedSiteAddressId = crownDevelopment.siteAddressId;
					}

					// If no existing address found, check if any child has an address
					if (!sharedSiteAddressId) {
						const linkedCaseWithAddress = crownDevelopment.ChildrenCrownDevelopment?.find(
							(child) => child.siteAddressId
						);
						sharedSiteAddressId = linkedCaseWithAddress?.siteAddressId ?? null;
					}
				}

				const plan = buildCaseUpdateWritePlan({
					toSave,
					dbViewModel,
					caseIds,
					scalarUpdateInput: updateInput,
					crownDevelopments: crownDevelopmentsForPlanning,
					sharedSiteAddressId
				});
				await executeCaseUpdateWritePlan(plan, tx);
			});
			updateSucceeded = true;
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating case',
				logParams: { id }
			});
		}

		if (updateSucceeded && service.isAuditLive !== false) {
			await recordAuditEntries(audit, id, userId, previousValues, answersSnapshot, updatedFieldNames, logger);
		}

		// show a banner to the user on success
		addCaseUpdatedSession(req, id);

		logger.info({ id }, 'case updated');
	};
}

/**
 * Add a case updated flag to the session
 */
function addCaseUpdatedSession(req: Request, id: string) {
	if (!req.session) {
		throw new Error('request session required');
	}
	addSessionData(req, id, { updated: true });
}

/**
 * Handle edit case updates with custom behaviour
 */
export function customUpdateCaseActions(
	service: ManageService,
	id: string,
	toSave: CrownDevelopmentSaveModel,
	fullViewModel: CrownDevelopmentViewModel
) {
	if (
		toSave.lpaQuestionnaireReceivedDate &&
		fullViewModel.lpaQuestionnaireReceivedEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeId !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		handleLpaQuestionnaireReceivedDateUpdate(service, id, toSave.lpaQuestionnaireReceivedDate);
	}

	if (toSave.lpaQuestionnaireSentDate && fullViewModel.lpaQuestionnaireSpecialEmailSent !== BOOLEAN_OPTIONS.YES) {
		handleLpaQuestionnaireSentDateUpdate(service, id);
	}

	if (toSave.applicationReceivedDate) {
		handleApplicationReceivedDateUpdate(service, id, fullViewModel, toSave.applicationReceivedDate);
	}

	if (
		toSave.turnedAwayDate &&
		fullViewModel.notNationallyImportantEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeId !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		handleTurnedAwayDateUpdate(service, id);
	}
}

/**
 * Send notifications and update flags for LPA questionnaire received date updates
 */
function handleLpaQuestionnaireReceivedDateUpdate(service: ManageService, id: string, receivedDate: Date) {
	sendNotificationAndUpdateFlag(
		sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, receivedDate),
		service.db,
		id,
		'lpaQuestionnaireReceivedEmailSent',
		service.logger,
		'sendLpaAcknowledgeReceiptOfQuestionnaireNotification'
	);
}

/**
 * Send notifications and update flags for LPA questionnaire sent date updates
 */
function handleLpaQuestionnaireSentDateUpdate(service: ManageService, id: string) {
	sendNotificationAndUpdateFlag(
		sendLpaQuestionnaireSentNotification(service, id),
		service.db,
		id,
		'lpaQuestionnaireSpecialEmailSent',
		service.logger,
		'sendLpaQuestionnaireSentNotification'
	);
}

/**
 * Handle application received date updates, including validation and notification logic
 */
function handleApplicationReceivedDateUpdate(
	service: ManageService,
	id: string,
	fullViewModel: CrownDevelopmentViewModel,
	receivedDate: Date
) {
	const validations = [
		{
			condition: !fullViewModel.siteAddressId && !fullViewModel.siteNorthing && !fullViewModel.siteEasting,
			message: 'Enter the site address',
			href: `/cases/${id}/overview/site-address`
		},
		{
			condition: !fullViewModel.siteAddressId && !fullViewModel.siteNorthing && !fullViewModel.siteEasting,
			message: 'Enter the site coordinates',
			href: `/cases/${id}/overview/site-coordinates`
		},
		{
			condition: !fullViewModel.hasApplicationFee,
			message: 'Confirm whether there is an application fee, and enter the amount if applicable',
			href: `/cases/${id}/fee/fee-amount`
		}
	];

	const errors: ErrorSummaryItem[] = [];
	validations.forEach(({ condition, message, href }) => {
		if (condition) {
			errors.push({ text: message, href });
		}
	});

	if (errors.length > 0) {
		throw buildSummaryError('Data required to set Application received date is missing', errors);
	}

	if (
		fullViewModel.applicationReceivedDateEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeId !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		sendNotificationAndUpdateFlag(
			sendApplicationReceivedNotification(service, id, receivedDate),
			service.db,
			id,
			'applicationReceivedDateEmailSent',
			service.logger,
			'sendApplicationReceivedNotification'
		);
	}
}

/**
 * Handle turned away date updates, including notification logic
 */
function handleTurnedAwayDateUpdate(service: ManageService, id: string) {
	sendNotificationAndUpdateFlag(
		sendApplicationNotOfNationalImportanceNotification(service, id),
		service.db,
		id,
		'notNationallyImportantEmailSent',
		service.logger,
		'sendApplicationNotOfNationalImportanceNotification'
	);
}

/**
 * Does the update input contain any fields that are not linked across linked cases?
 * Note that any scalar foreign keys also need their relation fields specifying (e.g. both statusId & Status)
 */
function updateContainsDeLinkedField(updateInput: Prisma.CrownDevelopmentUpdateInput): boolean {
	const deLinkedFields = [
		'id',
		'expectedDateOfSubmission',
		'reference',
		'statusId',
		'Status',
		'lpaReference',
		'applicationAcceptedDate',
		'lpaQuestionnaireReceivedDate',
		'publishDate',
		'neighboursNotifiedByLpaDate',
		'decisionOutcomeId',
		'DecisionOutcome',
		'representationsPublishDate',
		'representationsPeriodStartDate',
		'representationsPeriodEndDate',
		'assessorInspectorId',
		'subTypeId',
		'SubType',
		'hasApplicationFee',
		'applicationFee'
	];
	return Object.keys(updateInput).some((key) => deLinkedFields.includes(key));
}

/**
 * Records all audit entries for a case update.
 *
 * Handles two categories of fields:
 *   1. Scalar fields — compared individually via resolveFieldValues
 *   2. TODO CROWN-1641 List fields — diffed via entity-specific resolvers (contacts, inspectors, etc.)
 *
 * Wrapped in try/catch so audit failures never block the user's operation —
 * the case data has already been saved by the time this runs.
 */
async function recordAuditEntries(
	audit: AuditService,
	caseId: string,
	userId: string | undefined,
	previousValues: Record<string, unknown>,
	answersSnapshot: Record<string, unknown>,
	updatedFieldNames: string[],
	logger: Logger
): Promise<void> {
	// Bail out early if userId is missing — audit.recordMany requires a userId for every entry
	// and will throw/log when missing. This avoids noisy error logs and wasted work.
	const auditUserId = userId || 'Unknown-user';
	if (!userId) {
		logger.warn({ caseId, updatedFieldNames }, 'Recording audit with unknown-user: no userId available');
	}
	try {
		const allAuditEntries: AuditEntry[] = [];

		let envConfig: string;
		try {
			envConfig = loadEnvironmentConfig();
		} catch (e) {
			logger.warn({ caseId, error: e }, 'Failed to load environment config for audit resolution');
			envConfig = '';
		}

		// ── Scalar fields ────────────────────────────────────────────────
		for (const fieldName of updatedFieldNames) {
			// Only audit fields in the auditable set
			if (!AUDITABLE_SCALAR_FIELDS.has(fieldName)) {
				continue;
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
					fieldName: getFieldDisplayName(fieldName, FIELD_DISPLAY_NAMES),
					oldValue,
					newValue
				}
			});
		}

		await audit.recordMany(allAuditEntries, CASE_DATA_MODEL.CROWN);
	} catch (error: unknown) {
		// Audit failures should never block the user's operation.
		// The case data has already been saved successfully above.
		logger.error({ error, caseId }, 'Failed to record audit events');
	}
}

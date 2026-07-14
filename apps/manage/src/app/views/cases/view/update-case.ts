import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification,
	sendLpaQuestionnaireSentNotification
} from './notification.js';
import { CLEARABLE_SAVE_KEYS, editsToDatabaseUpdates, crownDevelopmentToViewModel } from './view-model.ts';
import { crownEditsToDatabaseUpdates } from './crown-edits.ts';
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
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { AUDIT_ACTIONS, type AuditService, type AuditEntry, type AuditAction } from '../../../audit/index.ts';
import { resolveFieldValues, getFieldDisplayName } from '../../../audit/resolvers/index.ts';
import type { Logger } from 'pino';

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
	'siteArea',
	'lpaReference',
	'agentOrganisationName',
	'hearingVenue',
	'inquiryVenue'
]);

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

		await customUpdateCaseActions(service, id, toSave, fullViewModel);

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

		if (updateSucceeded) {
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
export async function customUpdateCaseActions(
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
		await handleLpaQuestionnaireReceivedDateUpdate(service, id, toSave, toSave.lpaQuestionnaireReceivedDate);
	}

	if (toSave.lpaQuestionnaireSentDate && fullViewModel.lpaQuestionnaireSpecialEmailSent !== BOOLEAN_OPTIONS.YES) {
		await handleLpaQuestionnaireSentDateUpdate(service, id, toSave);
	}

	if (toSave.applicationReceivedDate) {
		await handleApplicationReceivedDateUpdate(service, id, toSave, fullViewModel, toSave.applicationReceivedDate);
	}

	if (
		toSave.turnedAwayDate &&
		fullViewModel.notNationallyImportantEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeId !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		await handleTurnedAwayDateUpdate(service, id, toSave);
	}
}

/**
 * Send notifications and update flags for LPA questionnaire received date updates
 */
async function handleLpaQuestionnaireReceivedDateUpdate(
	service: ManageService,
	id: string,
	toSave: CrownDevelopmentSaveModel,
	receivedDate: Date
) {
	await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, receivedDate);
	toSave['lpaQuestionnaireReceivedEmailSent'] = true;
}

/**
 * Send notifications and update flags for LPA questionnaire sent date updates
 */
async function handleLpaQuestionnaireSentDateUpdate(
	service: ManageService,
	id: string,
	toSave: CrownDevelopmentSaveModel
) {
	await sendLpaQuestionnaireSentNotification(service, id);
	toSave['lpaQuestionnaireSpecialEmailSent'] = true;
}

/**
 * Handle application received date updates, including validation and notification logic
 */
async function handleApplicationReceivedDateUpdate(
	service: ManageService,
	id: string,
	toSave: CrownDevelopmentSaveModel,
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
		await sendApplicationReceivedNotification(service, id, receivedDate);
		toSave['applicationReceivedDateEmailSent'] = true;
	}
}

/**
 * Handle turned away date updates, including notification logic
 */
async function handleTurnedAwayDateUpdate(service: ManageService, id: string, toSave: CrownDevelopmentSaveModel) {
	await sendApplicationNotOfNationalImportanceNotification(service, id);
	toSave['notNationallyImportantEmailSent'] = true;
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
	if (!userId) {
		logger.warn({ caseId, updatedFieldNames }, 'Skipping audit: no userId available');
		return;
	}

	try {
		const allAuditEntries: AuditEntry[] = [];

		// ── Scalar fields ────────────────────────────────────────────────
		for (const fieldName of updatedFieldNames) {
			// Only audit fields in the auditable set
			if (!AUDITABLE_SCALAR_FIELDS.has(fieldName)) {
				continue;
			}

			const { oldValue, newValue } = resolveFieldValues(fieldName, previousValues, answersSnapshot[fieldName]);

			if (oldValue === newValue) {
				continue;
			}

			let action: AuditAction;

			if (oldValue === '-') {
				action = AUDIT_ACTIONS.FIELD_SET;
			} else if (newValue === '-') {
				action = AUDIT_ACTIONS.FIELD_CLEARED;
			} else {
				action = AUDIT_ACTIONS.FIELD_UPDATED;
			}

			allAuditEntries.push({
				caseId,
				action,
				userId,
				metadata: {
					fieldName: getFieldDisplayName(fieldName),
					oldValue,
					newValue
				}
			});
		}

		await audit.recordMany(allAuditEntries);
	} catch (error: unknown) {
		// Audit failures should never block the user's operation.
		// The case data has already been saved successfully above.
		logger.error({ error, caseId }, 'Failed to record audit events');
	}
}

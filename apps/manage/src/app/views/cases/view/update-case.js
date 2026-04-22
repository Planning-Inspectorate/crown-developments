import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification,
	sendLpaQuestionnaireSentNotification
} from './notification.js';
import { editsToDatabaseUpdates, crownDevelopmentToViewModel } from './view-model.js';
import {
	hasOrganisationWriteEdits,
	buildCaseUpdateWritePlan,
	executeCaseUpdateWritePlan
} from './organisation-contact-updates.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @param {import('#service').ManageService} service
 * @param {boolean} [clearAnswer=false] - whether to clear the answer before saving
 * @returns {import('@planning-inspectorate/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateCase(service, clearAnswer = false) {
	return async ({ req, res, data }) => {
		const { db, logger } = service;
		const { id } = req.params;
		if (!id || typeof id !== 'string') {
			throw new Error(`invalid update case request, id param required (id:${id})`);
		}
		logger.info({ id }, 'case update');
		/** @type {import('./types.js').CrownDevelopmentViewModel} */
		const toSave = data?.answers || {};
		if (clearAnswer) {
			// clear the answer if requested
			Object.keys(toSave).forEach((key) => {
				toSave[key] = null;
			});
		}
		if (Object.keys(toSave).length === 0) {
			logger.info({ id }, 'no case updates to apply');
			return;
		}
		/** @type {import('./types.js').CrownDevelopmentViewModel} */
		const fullViewModel = res.locals?.journeyResponse?.answers || {};
		const originalAnswers = res.locals?.originalAnswers || {};

		await customUpdateCaseActions(service, id, toSave, fullViewModel);

		try {
			// Build a deterministic write-plan (no shared nested Organisations writes) and execute it
			// inside a single interactive transaction.
			await db.$transaction(async (tx) => {
				const crownDevelopment = await tx.crownDevelopment.findUnique({
					where: { id },
					include: {
						ParentCrownDevelopment: { select: { id: true } },
						ChildrenCrownDevelopment: { select: { id: true } },
						Organisations: {
							include: {
								Organisation: {
									include: {
										Address: true,
										OrganisationToContact: { include: { Contact: true } }
									}
								}
							}
						}
					}
				});
				if (!crownDevelopment) {
					throw new Error('Crown Development case not found');
				}

				// Fresh DB view model gives correct relation ids (organisationRelationId / organisationToContactRelationId)
				const dbViewModel = crownDevelopmentToViewModel(crownDevelopment);
				/** @type {import('./types.js').CrownDevelopmentViewModel} */
				const viewModelForUpdates = { ...dbViewModel };
				for (const [key, value] of Object.entries(originalAnswers)) {
					if (viewModelForUpdates[key] === undefined || viewModelForUpdates[key] === null) {
						viewModelForUpdates[key] = value;
					}
				}

				// IMPORTANT: organisations are excluded here because organisation/contact updates are handled
				// separately via the deterministic write plan (see buildCaseUpdateWritePlan/executeCaseUpdateWritePlan).
				let updateInput = editsToDatabaseUpdates(toSave, viewModelForUpdates, { includeOrganisations: false });
				updateInput.updatedDate = new Date();

				const caseIds = [id];
				if (crownDevelopment.linkedParentId && !updateContainsDeLinkedField(updateInput)) {
					caseIds.push(crownDevelopment.linkedParentId);
				}
				if (crownDevelopment.ChildrenCrownDevelopment?.length > 0 && !updateContainsDeLinkedField(updateInput)) {
					caseIds.push(...crownDevelopment.ChildrenCrownDevelopment.map((child) => child.id));
				}

				let crownDevelopmentsForPlanning = [crownDevelopment];
				if (hasOrganisationWriteEdits(toSave) && caseIds.length > 1) {
					crownDevelopmentsForPlanning = await tx.crownDevelopment.findMany({
						where: { id: { in: caseIds } },
						include: {
							Organisations: {
								include: {
									Organisation: {
										include: { Address: true, OrganisationToContact: { include: { Contact: true } } }
									}
								}
							}
						}
					});
				}

				const plan = buildCaseUpdateWritePlan({
					toSave,
					dbViewModel,
					caseIds,
					scalarUpdateInput: updateInput,
					crownDevelopments: crownDevelopmentsForPlanning
				});
				await executeCaseUpdateWritePlan(plan, tx);
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating case',
				logParams: { id }
			});
		}

		// show a banner to the user on success
		addCaseUpdatedSession(req, id);

		logger.info({ id }, 'case updated');
	};
}

/**
 * Add a case updated flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
function addCaseUpdatedSession(req, id) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const cases = req.session.cases || (req.session.cases = {});
	const caseProps = cases[id] || (cases[id] = {});
	caseProps.updated = true;
}

/**
 * Handle edit case updates with custom behaviour
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('./types.js').CrownDevelopmentViewModel} fullViewModel
 */
export async function customUpdateCaseActions(service, id, toSave, fullViewModel) {
	if (toSave.applicationFee !== undefined) {
		handleApplicationFee(toSave);
	}

	if (
		toSave.lpaQuestionnaireReceivedDate &&
		fullViewModel.lpaQuestionnaireReceivedEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeOfApplication !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		await handleLpaQuestionnaireReceivedDateUpdate(service, id, toSave);
	}

	if (toSave.lpaQuestionnaireSentDate && fullViewModel.lpaQuestionnaireSentSpecialEmailSent !== BOOLEAN_OPTIONS.YES) {
		await handleLpaQuestionnaireSentDateUpdate(service, id, toSave);
	}

	if (toSave.applicationReceivedDate) {
		await handleApplicationReceivedDateUpdate(service, id, toSave, fullViewModel);
	}

	if (
		toSave.turnedAwayDate &&
		fullViewModel.notNationallyImportantEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeOfApplication !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		await handleTurnedAwayDateUpdate(service, id, toSave);
	}
}

function handleApplicationFee(toSave) {
	if (typeof toSave.applicationFee === 'string') {
		toSave.applicationFee = Number(toSave.applicationFee.replace(/,/g, ''));
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 */
async function handleLpaQuestionnaireReceivedDateUpdate(service, id, toSave) {
	await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, toSave.lpaQuestionnaireReceivedDate);
	toSave['lpaQuestionnaireReceivedEmailSent'] = true;
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 */
async function handleLpaQuestionnaireSentDateUpdate(service, id, toSave) {
	await sendLpaQuestionnaireSentNotification(service, id);
	toSave['lpaQuestionnaireSentSpecialEmailSent'] = true;
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('./types.js').CrownDevelopmentViewModel} fullViewModel
 */
async function handleApplicationReceivedDateUpdate(service, id, toSave, fullViewModel) {
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

	const errors = [];
	validations.forEach(({ condition, message, href }) => {
		if (condition) {
			errors.push({ text: message, href });
		}
	});

	if (errors.length > 0) {
		const error = new Error('Data required to set Application received date is missing');
		error.errorSummary = errors;
		throw error;
	}

	if (
		fullViewModel.applicationReceivedDateEmailSent !== BOOLEAN_OPTIONS.YES &&
		fullViewModel.typeOfApplication !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	) {
		await sendApplicationReceivedNotification(service, id, toSave.applicationReceivedDate);
		toSave['applicationReceivedDateEmailSent'] = true;
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 */
async function handleTurnedAwayDateUpdate(service, id, toSave) {
	await sendApplicationNotOfNationalImportanceNotification(service, id);
	toSave['notNationallyImportantEmailSent'] = true;
}

/**
 * @param {object} updateInput
 * @returns {boolean}
 */
function updateContainsDeLinkedField(updateInput) {
	const deLinkedFields = [
		'id',
		'expectedDateOfSubmission',
		'reference',
		'statusId',
		'lpaReference',
		'applicationAcceptedDate',
		'lpaQuestionnaireReceivedDate',
		'publishDate',
		'neighboursNotifiedByLpaDate',
		'decisionOutcomeId',
		'representationsPublishDate',
		'representationsPeriodStartDate',
		'representationsPeriodEndDate',
		'assessorInspectorId',
		'subTypeId',
		'hasApplicationFee',
		'applicationFee'
	];
	return Object.keys(updateInput).some((key) => deLinkedFields.includes(key));
}

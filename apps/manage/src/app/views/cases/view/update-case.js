import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification,
	sendLpaQuestionnaireSentNotification
} from './notification.js';
import { editsToDatabaseUpdates, crownDevelopmentToViewModel } from './view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { isDefined } from '@pins/crowndev-lib/util/boolean.js';
import { extractContactFields } from '../util/contact.js';

/**
 * We have to handle updates to multi-applicant contact details separately
 * as they are not directly editable via nested writes in the main crown
 * development update, and require special handling to determine whether to
 * update existing contacts or create new ones without creating duplicates.
 *
 * NOTE: This is used with `db.$transaction([...])`, so it must return PrismaPromises
 * created from the same Prisma client instance.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} dbViewModel
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('#service').ManageService['db']} db
 * @returns {Array<ReturnType<db['contact']['update']>>}
 */
function updateContacts(dbViewModel, toSave, db) {
	if (!Array.isArray(toSave.manageApplicantContactDetails)) {
		return [];
	}

	const existingByJoinId = new Map(
		(dbViewModel.manageApplicantContactDetails || [])
			.filter((contact) => contact.organisationToContactRelationId && contact.id)
			.map((contact) => [contact.organisationToContactRelationId, contact])
	);

	const contactUpdates = toSave.manageApplicantContactDetails
		.map((contact) => {
			if (!contact?.organisationToContactRelationId) return null; // case 1 handled via nested Contact.create
			const existing = existingByJoinId.get(contact.organisationToContactRelationId);
			if (!existing?.id) return null;

			const next = extractContactFields(contact);
			const prev = extractContactFields(existing);

			const changed =
				next.firstName !== prev.firstName ||
				next.lastName !== prev.lastName ||
				next.email !== prev.email ||
				next.telephoneNumber !== prev.telephoneNumber;

			if (!changed) return null;
			return { contactId: existing.id, data: next };
		})
		.filter(isDefined);

	return contactUpdates.map(({ contactId, data }) =>
		db.contact.update({
			where: { id: contactId },
			data
		})
	);
}

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
			// Build the full set of PrismaPromises first, then submit them in one atomic transaction.
			// We still do a pre-read to compute relation ids, but the writes are all via db.$transaction([...]).
			const crownDevelopment = await db.crownDevelopment.findUnique({
				where: { id },
				include: {
					ParentCrownDevelopment: { select: { id: true } },
					ChildrenCrownDevelopment: { select: { id: true } },
					Organisations: {
						include: {
							Organisation: {
								select: {
									id: true,
									name: true,
									Address: true,
									OrganisationToContact: {
										select: {
											id: true,
											role: true,
											Contact: {
												select: {
													id: true,
													firstName: true,
													lastName: true,
													email: true,
													telephoneNumber: true
												}
											}
										}
									}
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

			const updateInput = editsToDatabaseUpdates(toSave, viewModelForUpdates);
			updateInput.updatedDate = new Date();

			logger.info({ fields: Object.keys(toSave) }, 'update case input');
			logger.info(updateInput.Organisations, 'organisation update');

			const updates = [id];

			if (crownDevelopment.linkedParentId && !updateContainsDeLinkedField(updateInput)) {
				updates.push(crownDevelopment.linkedParentId);
			}

			if (crownDevelopment.ChildrenCrownDevelopment?.length > 0 && !updateContainsDeLinkedField(updateInput)) {
				updates.push(...crownDevelopment.ChildrenCrownDevelopment.map((child) => child.id));
			}

			/** @type {any[]} */
			const transactionOperations = [];

			// Contact detail updates (cases 2 & 4)
			transactionOperations.push(...updateContacts(dbViewModel, toSave, db));

			// CrownDevelopment updates (including join-table moves & new contacts)
			transactionOperations.push(
				...updates.map((caseId) =>
					db.crownDevelopment.update({
						where: { id: caseId },
						data: updateInput
					})
				)
			);

			await db.$transaction(transactionOperations);
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

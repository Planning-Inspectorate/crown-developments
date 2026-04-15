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
import { extractApplicantContactFields, extractAgentContactFields } from '../util/contact.js';

import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @template T
 * @typedef {import('@prisma/client/runtime/client').PrismaPromise<T>} PrismaPromise
 */

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
 * @returns {Array<PrismaPromise<import('@pins/crowndev-database').Contact>>}
 */
function updateApplicantContacts(dbViewModel, toSave, db) {
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
			// If there is no organisationToContactRelationId, this is a new contact that will be
			// created via nested write in the main update, so we skip it here.
			if (!contact?.organisationToContactRelationId) return null;
			const existing = existingByJoinId.get(contact.organisationToContactRelationId);
			if (!existing?.id) return null;

			const newData = extractApplicantContactFields(contact);
			const existingData = extractApplicantContactFields(existing);

			const changed =
				newData.firstName !== existingData.firstName ||
				newData.lastName !== existingData.lastName ||
				newData.email !== existingData.email ||
				newData.telephoneNumber !== existingData.telephoneNumber;

			if (!changed) return null;
			return { contactId: existing.id, data: newData };
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
 * Same as applicant contacts, these need to be separate transactions.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} dbViewModel
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('#service').ManageService['db']} db
 * @returns {Array<PrismaPromise<import('@pins/crowndev-database').Contact>>}
 */
function updateAgentContacts(dbViewModel, toSave, db) {
	if (!Array.isArray(toSave.manageAgentContactDetails)) {
		return [];
	}

	const existingByContactId = new Map(
		(dbViewModel.manageAgentContactDetails || [])
			.filter((contact) => contact.id)
			.map((contact) => [contact.id, contact])
	);

	const contactUpdates = toSave.manageAgentContactDetails
		.map((contact) => {
			const existing = existingByContactId.get(contact.id);
			if (!existing?.id) return null;

			const newData = extractAgentContactFields(contact);
			const existingData = extractAgentContactFields(existing);

			const changed =
				newData.firstName !== existingData.firstName ||
				newData.lastName !== existingData.lastName ||
				newData.email !== existingData.email ||
				newData.telephoneNumber !== existingData.telephoneNumber;

			if (!changed) return null;
			return { contactId: contact.id, data: newData };
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
 * For linked-case updates, avoid creating duplicate Organisations by creating any new applicant Organisations once
 * and then linking them to each case via the join table.
 * If there are new organisations to add, it will perform that in this function and then return the link operations in
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput} updateInput
 * @param {Array<string>} updates
 * @param {import('#service').ManageService['db']} db
 * @returns {Promise<{ updateInput: import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput, linkOperations: PrismaPromise<unknown>[] }>}
 */
async function applySharedApplicantOrganisationCreates(toSave, updateInput, updates, db) {
	// Bail if no linked cases
	if (updates.length < 2) {
		return { updateInput, linkOperations: [] };
	}
	// Bail if no change in applicant orgs being saved
	if (!Array.isArray(toSave.manageApplicantDetails) || toSave.manageApplicantDetails.length === 0) {
		return { updateInput, linkOperations: [] };
	}
	// Bail if no Organisations field in the updateInput (shouldn't be possible if there are applicant org changes, but just in case)
	if (!updateInput?.Organisations || typeof updateInput.Organisations !== 'object') {
		return { updateInput, linkOperations: [] };
	}
	// Bail if applicant orgs not being created
	if (!('create' in updateInput.Organisations) || !Array.isArray(updateInput.Organisations.create)) {
		return { updateInput, linkOperations: [] };
	}

	// Identify the *new* applicant org creates coming from the nested write input.
	// We only want to create these once, then connect them to all linked cases.
	const createOps = /** @type {any[]} */ (updateInput.Organisations.create);
	/** @type {import('@pins/crowndev-database').Prisma.CrownDevelopmentToOrganisationCreateWithoutCrownDevelopmentInput[]} */
	const newApplicantOrgCreates = createOps.filter((createOp) => {
		if (!createOp || typeof createOp !== 'object') return false;
		if (createOp?.Role?.connect?.id !== ORGANISATION_ROLES_ID.APPLICANT) return false;
		const org = createOp?.Organisation;
		if (!org || typeof org !== 'object') return false;
		return 'create' in org;
	});

	if (newApplicantOrgCreates.length === 0) {
		return { updateInput, linkOperations: [] };
	}

	// Leader case: the first id in `updates` (always the current case id) will do the nested creates.
	// Other linked cases will just connect to the created Organisations.
	const [leaderCaseId, ...otherCaseIds] = updates;

	/** @type {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput} */
	const nextUpdateInput = { ...updateInput };
	delete nextUpdateInput.Organisations;

	// NOTE: Prisma nested create does not let us return *only* the newly created related rows.
	// Selecting applicant Organisations after the update returns *all* applicant orgs linked to the case.
	// To reliably link only the newly created Organisations, we explicitly create them and then link them.
	const createInputs = newApplicantOrgCreates
		.map((createOp) => createOp?.Organisation?.create)
		.filter((v) => v && typeof v === 'object');

	if (createInputs.length === 0) {
		return { updateInput: nextUpdateInput, linkOperations: [] };
	}

	/** @type {Array<string>} */
	const createdOrgIds = [];
	for (const orgCreate of createInputs) {
		const createdOrg = await db.organisation.create({
			data: orgCreate,
			select: { id: true }
		});
		createdOrgIds.push(createdOrg.id);
	}

	if (createdOrgIds.length === 0) {
		return { updateInput: nextUpdateInput, linkOperations: [] };
	}

	const leaderLinkOperations = createdOrgIds.map((orgId) =>
		db.crownDevelopment.update({
			where: { id: leaderCaseId },
			data: {
				Organisations: {
					create: [
						{
							Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
							Organisation: { connect: { id: orgId } }
						}
					]
				}
			}
		})
	);

	const linkOperations = leaderLinkOperations.concat(
		otherCaseIds.flatMap((caseId) =>
			createdOrgIds.map((orgId) =>
				db.crownDevelopment.update({
					where: { id: caseId },
					data: {
						Organisations: {
							create: [
								{
									Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
									Organisation: { connect: { id: orgId } }
								}
							]
						}
					}
				})
			)
		)
	);

	return { updateInput: nextUpdateInput, linkOperations };
}

/**
 * If the save payload contains contact-edit answers that create nested writes under `Organisations`,
 * we intentionally strip *all* `updateInput.Organisations` from the shared update payload.
 *
 * Those contact-join updates target case-specific join-row ids and cannot be safely applied to
 * linked cases using the same nested-write object.
 *
 * NOTE: this is intentionally broad in this codebase (other edit sections are not present in one save).
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput} updateInput
 * @returns {{ sharedUpdateInput: import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput, hasOrganisationContactEdits: boolean }}
 */
function splitSharedUpdateFromOrganisationContactEdits(toSave, updateInput) {
	const hasApplicantContactEdits = Object.hasOwn(toSave, 'manageApplicantContactDetails');
	const hasAgentContactEdits = Object.hasOwn(toSave, 'manageAgentContactDetails');
	const hasOrganisationContactEdits = hasApplicantContactEdits || hasAgentContactEdits;

	if (!hasOrganisationContactEdits) {
		return { sharedUpdateInput: updateInput, hasOrganisationContactEdits: false };
	}

	/** @type {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput} */
	const sharedUpdateInput = { ...updateInput };
	delete sharedUpdateInput.Organisations;
	return { sharedUpdateInput, hasOrganisationContactEdits: true };
}

/**
 * Build current-case-only nested writes for Organisation contact join updates.
 *
 * These are built against a fresh DB view model for the *current case* so relation ids are correct.
 *
 * @param {import('#service').ManageService['db']} db
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @returns {Promise<PrismaPromise<unknown>[]>}
 */
export async function buildOrganisationContactJoinUpdateOperations(db, id, toSave) {
	const hasApplicantContactEdits = Object.hasOwn(toSave, 'manageApplicantContactDetails');
	const hasAgentContactEdits = Object.hasOwn(toSave, 'manageAgentContactDetails');
	if (!hasApplicantContactEdits && !hasAgentContactEdits) {
		return [];
	}

	const crownDevelopment = await db.crownDevelopment.findUnique({
		where: { id },
		include: {
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
		return [];
	}

	const caseViewModel = crownDevelopmentToViewModel(crownDevelopment);
	/** @type {PrismaPromise<unknown>[]} */
	const operations = [];

	if (hasApplicantContactEdits) {
		const applicantContactUpdateInput = editsToDatabaseUpdates(
			{ manageApplicantContactDetails: toSave.manageApplicantContactDetails },
			caseViewModel
		);
		if (applicantContactUpdateInput?.Organisations) {
			operations.push(
				db.crownDevelopment.update({
					where: { id },
					data: { Organisations: applicantContactUpdateInput.Organisations }
				})
			);
		}
	}

	if (hasAgentContactEdits) {
		const agentContactUpdateInput = editsToDatabaseUpdates(
			{ manageAgentContactDetails: toSave.manageAgentContactDetails },
			caseViewModel
		);
		if (agentContactUpdateInput?.Organisations) {
			operations.push(
				db.crownDevelopment.update({
					where: { id },
					data: { Organisations: agentContactUpdateInput.Organisations }
				})
			);
		}
	}

	return operations;
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
								include: {
									Address: true,
									OrganisationToContact: {
										include: {
											Contact: true
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

			let updateInput = editsToDatabaseUpdates(toSave, viewModelForUpdates);
			updateInput.updatedDate = new Date();

			const split = splitSharedUpdateFromOrganisationContactEdits(toSave, updateInput);
			updateInput = split.sharedUpdateInput;

			const updates = [id];

			if (crownDevelopment.linkedParentId && !updateContainsDeLinkedField(updateInput)) {
				updates.push(crownDevelopment.linkedParentId);
			}

			if (crownDevelopment.ChildrenCrownDevelopment?.length > 0 && !updateContainsDeLinkedField(updateInput)) {
				updates.push(...crownDevelopment.ChildrenCrownDevelopment.map((child) => child.id));
			}

			/** @type {PrismaPromise<unknown>[]} */
			const transactionOperations = [];

			// Contact detail updates for existing contacts
			transactionOperations.push(...updateApplicantContacts(dbViewModel, toSave, db));
			transactionOperations.push(...updateAgentContacts(dbViewModel, toSave, db));

			const sharedApplicantOrgs = await applySharedApplicantOrganisationCreates(toSave, updateInput, updates, db);
			updateInput = sharedApplicantOrgs.updateInput;
			transactionOperations.push(...sharedApplicantOrgs.linkOperations);
			// CrownDevelopment updates (excluding applicant-contact join-table updates if present)
			transactionOperations.push(
				...updates.map((caseId) =>
					db.crownDevelopment.update({
						where: { id: caseId },
						data: updateInput
					})
				)
			);

			if (split.hasOrganisationContactEdits) {
				transactionOperations.push(...(await buildOrganisationContactJoinUpdateOperations(db, id, toSave)));
			}

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

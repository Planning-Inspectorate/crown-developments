import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { toFloat, toInt } from '@pins/crowndev-lib/util/numbers.js';
import { booleanToYesNoValue } from '@pins/dynamic-forms/src/components/boolean/question.js';

/**
 * CrownDevelopment fields that do not need mapping to a (or from) the view model
 * @type {Readonly<import('./types.js').CrownDevelopmentViewModelFields[]>}
 */
const UNMAPPED_VIEW_MODEL_FIELDS = Object.freeze([
	'reference',
	'description',
	'typeId',
	'lpaId',
	'siteNorthing',
	'siteEasting',
	'siteArea',
	'expectedDateOfSubmission',
	'decisionOutcomeId',
	'updatedDate',
	'procedureId',
	'stageId',
	'statusId',
	'lpaReference',
	'nationallyImportant',
	'nationallyImportantConfirmationDate',
	'isGreenBelt',
	'siteIsVisibleFromPublicLand',
	'healthAndSafetyIssue',
	'applicationReceivedDate',
	'applicationCompleteDate',
	'lpaQuestionnaireSentDate',
	'lpaQuestionnaireReceivedDate',
	'publishDate',
	'pressNoticeDate',
	'neighboursNotifiedByLpaDate',
	'siteNoticeByLpaDate',
	'targetDecisionDate',
	'extendedTargetDecisionDate',
	'recoveredDate',
	'recoveredReportSentDate',
	'withdrawnDate',
	'decisionDate',
	'originalDecisionDate',
	'turnedAwayDate',
	'representationsPublishDate',
	'inspector1Id',
	'inspector2Id',
	'inspector3Id',
	'assessorInspectorId',
	'caseOfficerId',
	'planningOfficerId',
	'eiaScreening',
	'eiaScreeningOutcome',
	'environmentalStatementReceivedDate',
	// map relation ids for updates
	'siteAddressId',
	'applicantContactId',
	'agentContactId',
	'eventId'
]);

/**
 * Field prefixes used for the contact fields in the view model
 * @type {typeof import('./types.js').CONTACT_PREFIXES}
 */
const CONTACT_PREFIXES = Object.freeze({
	APPLICANT: 'applicant',
	AGENT: 'agent'
});

/**
 *
 * @param {import('./types.js').CrownDevelopmentPayload} crownDevelopment
 * @returns {import('./types.js').CrownDevelopmentViewModel}
 */
export function crownDevelopmentToViewModel(crownDevelopment) {
	/** @type {import('./types.js').CrownDevelopmentViewModel} */
	const viewModel = {};
	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		viewModel[field] =
			typeof crownDevelopment[field] === 'boolean'
				? booleanToYesNoValue(crownDevelopment[field])
				: crownDevelopment[field];
	}
	if (crownDevelopment.representationsPeriodStartDate || crownDevelopment.representationsPeriodEndDate) {
		viewModel.representationsPeriod = {
			start: crownDevelopment.representationsPeriodStartDate,
			end: crownDevelopment.representationsPeriodEndDate
		};
	}
	viewModel.siteArea = crownDevelopment.siteArea?.toNumber();
	if (!viewModel.updatedDate) {
		viewModel.updatedDate = crownDevelopment.createdDate;
	}

	if (crownDevelopment.SiteAddress) {
		viewModel.siteAddress = addressToViewModel(crownDevelopment.SiteAddress);
	}

	if (crownDevelopment.Category) {
		viewModel.subCategoryId = crownDevelopment.Category.id;
	}

	addLpaDetailsToViewModel(viewModel, crownDevelopment.Lpa);
	addContactToViewModel(viewModel, crownDevelopment.ApplicantContact, 'applicant');
	addContactToViewModel(viewModel, crownDevelopment.AgentContact, 'agent');

	if (hasProcedure(crownDevelopment.procedureId)) {
		const event = crownDevelopment.Event || {};
		addEventToViewModel(viewModel, event, crownDevelopment.procedureId, crownDevelopment.procedureNotificationDate);
	}

	return viewModel;
}

/**
 * Answers/edits are received in 'view-model' form, and are mapped here to the appropriate database input.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits - edited fields only
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel - full view model with all case details
 * @returns {import('@prisma/client').Prisma.CrownDevelopmentUpdateInput}
 */
export function editsToDatabaseUpdates(edits, viewModel) {
	/** @type {import('@prisma/client').Prisma.CrownDevelopmentUpdateInput} */
	const crownDevelopmentUpdateInput = {};
	// map all the regular fields to the update input
	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		if (Object.hasOwn(edits, field)) {
			crownDevelopmentUpdateInput[field] = edits[field];
		}
	}
	// don't support updating these fields
	delete crownDevelopmentUpdateInput.reference;
	delete crownDevelopmentUpdateInput.updatedDate;

	// set number fields
	if ('siteNorthing' in edits || 'siteEasting' in edits) {
		crownDevelopmentUpdateInput.siteNorthing = toInt(edits.siteNorthing);
		crownDevelopmentUpdateInput.siteEasting = toInt(edits.siteEasting);
	}
	if ('siteArea' in edits) {
		crownDevelopmentUpdateInput.siteArea = toFloat(edits.siteArea);
	}

	if (edits.representationsPeriod) {
		crownDevelopmentUpdateInput.representationsPeriodStartDate = edits.representationsPeriod.start;
		crownDevelopmentUpdateInput.representationsPeriodEndDate = edits.representationsPeriod.end;
	}

	// update relations

	if (edits.subCategoryId) {
		crownDevelopmentUpdateInput.Category = {
			connect: { id: edits.subCategoryId }
		};
	}

	if ('siteAddress' in edits) {
		const siteAddress = viewModelToAddressUpdateInput(edits.siteAddress);
		if (siteAddress) {
			const siteAddressId = viewModel.siteAddressId;
			const siteAddressWhere = siteAddressId ? { id: siteAddressId } : undefined;
			crownDevelopmentUpdateInput.SiteAddress = {
				upsert: {
					where: siteAddressWhere,
					create: siteAddress,
					update: siteAddress
				}
			};
		}
	}

	const applicantContactUpdates = viewModelToNestedContactUpdate(edits, CONTACT_PREFIXES.APPLICANT, viewModel);
	if (applicantContactUpdates) {
		crownDevelopmentUpdateInput.ApplicantContact = applicantContactUpdates;
	}

	const agentContactUpdates = viewModelToNestedContactUpdate(edits, CONTACT_PREFIXES.AGENT, viewModel);
	if (agentContactUpdates) {
		crownDevelopmentUpdateInput.AgentContact = agentContactUpdates;
	}

	if (hasProcedure(viewModel.procedureId)) {
		const eventUpdates = viewModelToEventUpdateInput(edits, viewModel.procedureId);
		if (eventUpdates.eventUpdateInput) {
			const eventId = viewModel.eventId;
			const eventWhere = eventId ? { id: eventId } : undefined;
			crownDevelopmentUpdateInput.Event = {
				upsert: {
					where: eventWhere,
					create: eventUpdates.eventUpdateInput,
					update: eventUpdates.eventUpdateInput
				}
			};
		}
		if (eventUpdates.procedureNotificationDate) {
			crownDevelopmentUpdateInput.procedureNotificationDate = eventUpdates.procedureNotificationDate;
		}
	}

	return crownDevelopmentUpdateInput;
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@prisma/client').Prisma.ContactGetPayload<{include: {Address: true}}>|null} contact
 * @param {import('./types.js').ContactTypeValues} prefix
 */
function addContactToViewModel(viewModel, contact, prefix) {
	if (contact) {
		viewModel[`${prefix}ContactName`] = contact.fullName;
		viewModel[`${prefix}ContactTelephoneNumber`] = contact.telephoneNumber;
		viewModel[`${prefix}ContactEmail`] = contact.email;
		if (contact.Address) {
			viewModel[`${prefix}ContactAddress`] = addressToViewModel(contact.Address);
			viewModel[`${prefix}ContactAddressId`] = contact.addressId;
		}
	}
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').ContactTypeValues} prefix
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@prisma/client').Prisma.ContactUpdateOneWithoutCrownDevelopmentApplicantNestedInput|null}
 */
function viewModelToNestedContactUpdate(edits, prefix, viewModel) {
	/** @type {import('@prisma/client').Prisma.ContactCreateInput} */
	const createInput = {};

	if (`${prefix}ContactName` in edits) {
		createInput.fullName = edits[`${prefix}ContactName`];
	}
	if (`${prefix}ContactTelephoneNumber` in edits) {
		createInput.telephoneNumber = edits[`${prefix}ContactTelephoneNumber`];
	}
	if (`${prefix}ContactEmail` in edits) {
		createInput.email = edits[`${prefix}ContactEmail`];
	}
	if (`${prefix}ContactAddress` in edits) {
		const addressUpdateInput = viewModelToAddressUpdateInput(edits[`${prefix}ContactAddress`]);
		createInput.Address = {
			create: addressUpdateInput
		};
	}
	if (Object.keys(createInput).length === 0) {
		return null;
	}
	const contactExists = Boolean(viewModel[`${prefix}ContactId`]);

	if (!contactExists) {
		return {
			create: createInput
		};
	}
	/** @type {import('@prisma/client').Prisma.ContactUpdateInput} */
	const updateInput = {
		...createInput
	};
	if (updateInput.Address) {
		const addressId = viewModel[`${prefix}ContactAddressId`];
		const addressWhere = addressId && { id: addressId };
		updateInput.Address = {
			upsert: {
				where: addressWhere,
				create: updateInput.Address.create,
				update: updateInput.Address.create
			}
		};
	}
	return {
		update: updateInput
	};
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@prisma/client').Prisma.LpaGetPayload<{include: {Address: true}}>|null} lpa
 */
function addLpaDetailsToViewModel(viewModel, lpa) {
	if (lpa) {
		viewModel['lpaTelephoneNumber'] = lpa.telephoneNumber;
		viewModel['lpaEmail'] = lpa.email;
		if (lpa.Address) {
			viewModel['lpaAddress'] = addressToViewModel(lpa.Address);
		}
	}
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@prisma/client').Prisma.EventGetPayload<{}>} event
 * @param {string|null} procedureId
 * @param {Date|null} [procedureNotificationDate]
 */
function addEventToViewModel(viewModel, event, procedureId, procedureNotificationDate) {
	const prefix = eventPrefix(procedureId);
	viewModel[`${prefix}ProcedureNotificationDate`] = procedureNotificationDate;
	viewModel[`${prefix}Date`] = event.date;
	viewModel[`${prefix}Duration`] = event.duration;
	viewModel[`${prefix}Venue`] = event.venue;
	viewModel[`${prefix}NotificationDate`] = event.notificationDate;
	viewModel[`${prefix}StatementsDate`] = event.statementsDate;
	viewModel[`${prefix}CaseManagementConferenceDate`] = event.caseManagementConferenceDate;

	if (isHearing(procedureId)) {
		viewModel[`${prefix}IssuesReportPublishedDate`] = event.issuesReportPublishedDate;
	}
	if (isInquiry(procedureId)) {
		viewModel[`${prefix}ProofsOfEvidenceDate`] = event.proofsOfEvidenceDate;
	}
}

/**
 * @param {import('@prisma/client').Prisma.AddressGetPayload<{}>} address
 * @returns {import('@pins/dynamic-forms/src/lib/address.js').Address}
 */
function addressToViewModel(address) {
	return {
		id: address.id,
		addressLine1: address.line1,
		addressLine2: address.line2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};
}

/**
 * @param {import('@pins/dynamic-forms/src/lib/address.js').Address} edits
 * @returns {import('@prisma/client').Prisma.AddressCreateInput|null}
 */
function viewModelToAddressUpdateInput(edits) {
	return {
		line1: edits?.addressLine1 ?? null,
		line2: edits?.addressLine2 ?? null,
		townCity: edits?.townCity ?? null,
		county: edits?.county ?? null,
		postcode: edits?.postcode ?? null
	};
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function hasProcedure(procedureId) {
	return isInquiry(procedureId) || isHearing(procedureId) || isWrittenReps(procedureId);
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function isWrittenReps(procedureId) {
	return procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS;
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function isInquiry(procedureId) {
	return procedureId === APPLICATION_PROCEDURE_ID.INQUIRY;
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function isHearing(procedureId) {
	return procedureId === APPLICATION_PROCEDURE_ID.HEARING;
}

/**
 * @param {string|null} procedureId
 * @returns {string}
 */
function eventPrefix(procedureId) {
	switch (procedureId) {
		case APPLICATION_PROCEDURE_ID.INQUIRY:
			return 'inquiry';
		case APPLICATION_PROCEDURE_ID.HEARING:
			return 'hearing';
		case APPLICATION_PROCEDURE_ID.WRITTEN_REPS:
			return 'writtenReps';
	}
	throw new Error(
		`invalid procedureId, expected ${APPLICATION_PROCEDURE_ID.HEARING} or ${APPLICATION_PROCEDURE_ID.INQUIRY}, got ${procedureId}`
	);
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {string} procedureId
 * @returns {{eventUpdateInput: import('@prisma/client').Prisma.EventUpdateInput|null, procedureNotificationDate: Date|string|null}}
 */
function viewModelToEventUpdateInput(edits, procedureId) {
	/** @type {import('@prisma/client').Prisma.EventUpdateInput} */
	const eventUpdateInput = {};
	const updates = {
		eventUpdateInput: null,
		procedureNotificationDate: null
	};

	const prefix = eventPrefix(procedureId);

	if (edits[`${prefix}Date`]) {
		eventUpdateInput.date = edits[`${prefix}Date`];
	}
	if (edits[`${prefix}Duration`]) {
		eventUpdateInput.duration = edits[`${prefix}Duration`];
	}
	if (edits[`${prefix}Venue`]) {
		eventUpdateInput.venue = edits[`${prefix}Venue`];
	}
	if (edits[`${prefix}IssuesReportPublishedDate`]) {
		eventUpdateInput.issuesReportPublishedDate = edits[`${prefix}IssuesReportPublishedDate`];
	}
	if (edits[`${prefix}ProcedureNotificationDate`]) {
		updates.procedureNotificationDate = edits[`${prefix}ProcedureNotificationDate`];
	}
	if (edits[`${prefix}NotificationDate`]) {
		eventUpdateInput.notificationDate = edits[`${prefix}NotificationDate`];
	}
	if (edits[`${prefix}StatementsDate`]) {
		eventUpdateInput.statementsDate = edits[`${prefix}StatementsDate`];
	}
	if (edits[`${prefix}CaseManagementConferenceDate`]) {
		eventUpdateInput.caseManagementConferenceDate = edits[`${prefix}CaseManagementConferenceDate`];
	}
	if (edits[`${prefix}ProofsOfEvidenceDate`]) {
		eventUpdateInput.proofsOfEvidenceDate = edits[`${prefix}ProofsOfEvidenceDate`];
	}

	if (Object.keys(eventUpdateInput).length > 0) {
		updates.eventUpdateInput = eventUpdateInput;
	}
	return updates;
}

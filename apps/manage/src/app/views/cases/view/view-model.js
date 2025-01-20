import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

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
	'applicationAcceptedDate',
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
	'representationsPeriodStartDate',
	'representationsPeriodEndDate',
	'inspectorId',
	'assessorInspectorId',
	'caseOfficerId',
	'planningOfficerId',
	'eiaScreening',
	'eiaScreeningOutcome',
	'environmentalStatementReceivedDate'
]);

/**
 *
 * @param {import('./types.js').CrownDevelopmentPayload} crownDevelopment
 * @returns {import('./types.js').CrownDevelopmentViewModel}
 */
export function crownDevelopmentToViewModel(crownDevelopment) {
	/** @type {import('./types.js').CrownDevelopmentViewModel} */
	const viewModel = {};
	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		viewModel[field] = crownDevelopment[field];
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

	if (crownDevelopment.Event && isInquiryOrHearing(crownDevelopment.procedureId)) {
		const event = crownDevelopment.Event;
		addEventToViewModel(viewModel, event, crownDevelopment.procedureId, crownDevelopment.procedureNotificationDate);
	}

	return viewModel;
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@prisma/client').Prisma.ContactGetPayload<{include: {Address: true}}>|null} contact
 * @param {string} prefix
 */
function addContactToViewModel(viewModel, contact, prefix) {
	if (contact) {
		viewModel[`${prefix}ContactName`] = contact.fullName;
		viewModel[`${prefix}ContactTelephoneNumber`] = contact.telephoneNumber;
		viewModel[`${prefix}ContactEmail`] = contact.email;
		if (contact.Address) {
			viewModel[`${prefix}ContactAddress`] = addressToViewModel(contact.Address);
		}
	}
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
		addressLine1: address.line1,
		addressLine2: address.line2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function isInquiryOrHearing(procedureId) {
	return isInquiry(procedureId) || isHearing(procedureId);
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
	}
	throw new Error(
		`invalid procedureId, expected ${APPLICATION_PROCEDURE_ID.HEARING} or ${APPLICATION_PROCEDURE_ID.INQUIRY}, got ${procedureId}`
	);
}

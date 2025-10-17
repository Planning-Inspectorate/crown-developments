import { APPLICATION_PROCEDURE_ID, APPLICATION_STAGE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { toFloat, toInt } from '@pins/crowndev-lib/util/numbers.js';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { optionalWhere } from '@pins/crowndev-lib/util/database.js';
import { addressToViewModel, viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.js';
import { parseNumberStringToNumber } from '@pins/crowndev-lib/util/numbers.js';
/**
 * CrownDevelopment fields that do not need mapping to a (or from) the view model
 * @type {Readonly<import('./types.js').CrownDevelopmentViewModelFields[]>}
 */
const UNMAPPED_VIEW_MODEL_FIELDS = Object.freeze([
	'reference',
	'description',
	'typeId',
	'subTypeId',
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
	'eventId',
	'lpaQuestionnaireReceivedEmailSent',
	'hasApplicationFee',
	'applicationFee',
	'applicationReceivedDateEmailSent',
	'notNationallyImportantEmailSent',
	'siteVisitDate'
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
			if (field === 'lpaId' && edits.lpaId === viewModel.lpaId) {
				const error = new Error('Select a new Local Planning Authority or select ‘Back’ to discard your changes');
				error.fieldName = 'lpaId';
				throw error;
			}
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
			crownDevelopmentUpdateInput.SiteAddress = {
				upsert: {
					where: optionalWhere(viewModel.siteAddressId),
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

	if ('procedureId' in edits && edits.procedureId !== viewModel.procedureId) {
		// delete procedureId update due to needing to handle as relational change rather than scalar field update
		delete crownDevelopmentUpdateInput.procedureId;
		if (edits.procedureId) {
			crownDevelopmentUpdateInput.Procedure = {
				connect: { id: edits.procedureId }
			};
			if (stageIsProcedure(viewModel.stageId)) {
				// If the current stage is a procedure, update it to match the new procedure
				crownDevelopmentUpdateInput.Stage = {
					connect: {
						id:
							edits.procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS
								? APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS
								: edits.procedureId
					}
				};
			}
		} else {
			// Added to handle the case where a procedure is removed (set to null)
			crownDevelopmentUpdateInput.Procedure = {
				disconnect: true
			};
			if (stageIsProcedure(viewModel.stageId)) {
				crownDevelopmentUpdateInput.Stage = {
					connect: { id: APPLICATION_STAGE_ID.PROCEDURE_DECISION }
				};
			}
		}
		crownDevelopmentUpdateInput.procedureNotificationDate = null;
		if (viewModel.eventId) {
			// delete existing event if procedure changed and there is an existing event
			crownDevelopmentUpdateInput.Event = {
				delete: true
			};
		}
	}
	if (hasProcedure(viewModel.procedureId)) {
		const eventUpdates = viewModelToEventUpdateInput(edits, viewModel.procedureId);

		if (eventUpdates.eventUpdateInput && Object.keys(eventUpdates.eventUpdateInput).length > 0) {
			crownDevelopmentUpdateInput.Event = {
				upsert: {
					where: optionalWhere(viewModel.eventId),
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
		viewModel[`${prefix}ContactName`] = contact.orgName;
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
		createInput.orgName = edits[`${prefix}ContactName`];
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
		updateInput.Address = {
			upsert: {
				where: optionalWhere(addressId),
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
	viewModel[`${prefix}Venue`] = event.venue;
	viewModel[`${prefix}NotificationDate`] = event.notificationDate;
	viewModel[`${prefix}StatementsDate`] = event.statementsDate;
	viewModel[`${prefix}CaseManagementConferenceDate`] = event.caseManagementConferenceDate;

	const prep = event.prepDuration ?? '';
	const sitting = event.sittingDuration ?? '';
	const reporting = event.reportingDuration ?? '';

	if (
		(prep === '' || prep === null) &&
		(sitting === '' || sitting === null) &&
		(reporting === '' || reporting === null)
	) {
		viewModel[`${prefix}Duration`] = '-';
	} else {
		delete viewModel[`${prefix}Duration`];
		viewModel[`${prefix}DurationPrep`] = prep === '' || prep === null ? '' : prep;
		viewModel[`${prefix}DurationSitting`] = sitting === '' || sitting === null ? '' : sitting;
		viewModel[`${prefix}DurationReporting`] = reporting === '' || reporting === null ? '' : reporting;
	}

	if (isHearing(procedureId)) {
		viewModel[`${prefix}IssuesReportPublishedDate`] = event.issuesReportPublishedDate;
	}
	if (isInquiry(procedureId)) {
		viewModel[`${prefix}ProofsOfEvidenceDate`] = event.proofsOfEvidenceDate;
	}
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function hasProcedure(procedureId) {
	return isInquiry(procedureId) || isHearing(procedureId) || isWrittenReps(procedureId);
}

function stageIsProcedure(stageId) {
	return isInquiry(stageId) || isHearing(stageId) || stageId === APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS;
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

	if (`${prefix}Date` in edits) {
		eventUpdateInput.date = edits[`${prefix}Date`];
	}
	if (`${prefix}StatementsDate` in edits) {
		eventUpdateInput.statementsDate = edits[`${prefix}StatementsDate`];
	}
	if (`${prefix}CaseManagementConferenceDate` in edits) {
		eventUpdateInput.caseManagementConferenceDate = edits[`${prefix}CaseManagementConferenceDate`];
	}
	if (`${prefix}ProofsOfEvidenceDate` in edits) {
		eventUpdateInput.proofsOfEvidenceDate = edits[`${prefix}ProofsOfEvidenceDate`];
	}
	if (`${prefix}DurationPrep` in edits) {
		eventUpdateInput.prepDuration = parseNumberStringToNumber(edits[`${prefix}DurationPrep`]);
	}
	if (`${prefix}DurationSitting` in edits) {
		eventUpdateInput.sittingDuration = parseNumberStringToNumber(edits[`${prefix}DurationSitting`]);
	}
	if (`${prefix}DurationReporting` in edits) {
		eventUpdateInput.reportingDuration = parseNumberStringToNumber(edits[`${prefix}DurationReporting`]);
	}

	if (`${prefix}Venue` in edits) {
		eventUpdateInput.venue = edits[`${prefix}Venue`];
	}
	if (`${prefix}IssuesReportPublishedDate` in edits) {
		eventUpdateInput.issuesReportPublishedDate = edits[`${prefix}IssuesReportPublishedDate`];
	}
	if (`${prefix}ProcedureNotificationDate` in edits) {
		updates.procedureNotificationDate = edits[`${prefix}ProcedureNotificationDate`];
	}
	if (`${prefix}NotificationDate` in edits) {
		eventUpdateInput.notificationDate = edits[`${prefix}NotificationDate`];
	}
	if (Object.keys(eventUpdateInput).length > 0) {
		updates.eventUpdateInput = eventUpdateInput;
	}
	return updates;
}

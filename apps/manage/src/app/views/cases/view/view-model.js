import {
	APPLICATION_PROCEDURE_ID,
	APPLICATION_STAGE_ID,
	CONTACT_ROLES_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { toFloat, toInt } from '@pins/crowndev-lib/util/numbers.js';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { optionalWhere } from '@pins/crowndev-lib/util/database.js';
import { addressToViewModel, viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.js';
import { parseNumberStringToNumber } from '@pins/crowndev-lib/util/numbers.js';
import { extractContactFields } from '../util/contact.js';

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
	'hasSecondaryLpa',
	'secondaryLpaId',
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
	'applicationFeeReceivedDate',
	'eligibleForFeeRefund',
	'applicationFeeRefundAmount',
	'applicationFeeRefundDate',
	'applicationReceivedDateEmailSent',
	'notNationallyImportantEmailSent',
	'siteVisitDate',
	'cilLiable',
	'cilAmount',
	'bngExempt',
	'hasCostsApplications',
	'costsApplicationsComment',
	'environmentalImpactAssessment',
	'developmentPlan',
	'rightOfWay'
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

	if (
		crownDevelopment.ParentCrownDevelopment ||
		(crownDevelopment.ChildrenCrownDevelopment && crownDevelopment.ChildrenCrownDevelopment.length > 0)
	) {
		const childrenReferences = (crownDevelopment.ChildrenCrownDevelopment ?? []).map((child) => child.reference);

		viewModel.connectedApplication =
			crownDevelopment.ParentCrownDevelopment?.reference ?? childrenReferences.join(', ');
	}

	if (crownDevelopment.Organisations) {
		viewModel.manageApplicantDetails = crownDevelopment.Organisations.map((crownToOrganisation) => {
			return {
				id: crownToOrganisation.Organisation.id,
				organisationName: crownToOrganisation.Organisation.name,
				organisationAddress: addressToViewModel(crownToOrganisation.Organisation.Address) || {},
				organisationRelationId: crownToOrganisation.id
			};
		});

		viewModel.manageApplicantContactDetails = crownDevelopment.Organisations.flatMap((crownToOrganisation) =>
			(crownToOrganisation.Organisation.OrganisationToContact ?? [])
				.filter((orgToContact) => orgToContact.role === CONTACT_ROLES_ID.APPLICANT)
				.map((orgToContact) => ({
					// This ID is used for the session. However, it should be fine to use the
					// database-generated contact ID here.
					id: orgToContact.Contact.id,
					// Used for updating existing contacts, as the relation ID is needed to
					// target the correct relation record for updates. If this is not present,
					// the update will assume it's a new contact and attempt to create it instead.
					organisationToContactRelationId: orgToContact.id,
					applicantFirstName: orgToContact.Contact.firstName ?? '',
					applicantLastName: orgToContact.Contact.lastName ?? '',
					applicantContactEmail: orgToContact.Contact.email ?? '',
					applicantContactTelephoneNumber: orgToContact.Contact.telephoneNumber ?? '',
					applicantContactOrganisation: crownToOrganisation.organisationId
				}))
		);
	}

	addLpaDetailsToViewModel(viewModel, crownDevelopment.Lpa);

	if (crownDevelopment.hasSecondaryLpa === true) {
		addLpaDetailsToViewModel(viewModel, crownDevelopment.SecondaryLpa, 'secondaryLpa');
	}

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
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput}
 */
export function editsToDatabaseUpdates(edits, viewModel) {
	/** @type {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput} */
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

	// Applicant contacts linked to organisations (multi-applicant feature)
	if ('manageApplicantContactDetails' in edits) {
		crownDevelopmentUpdateInput.Organisations = buildApplicantContactOrganisationUpdates(edits, viewModel);
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

	// If you select no for hasSecondaryLpa then it should remove the secondaryLpa answers,
	// and if you remove the secondaryLpa then it should set hasSecondaryLpa to false
	if (
		('hasSecondaryLpa' in edits && edits.hasSecondaryLpa === false) ||
		('secondaryLpaId' in edits && edits.secondaryLpaId === null)
	) {
		crownDevelopmentUpdateInput.hasSecondaryLpa = false;

		delete crownDevelopmentUpdateInput.secondaryLpaId;
		crownDevelopmentUpdateInput.SecondaryLpa = { disconnect: true };
	}
	return crownDevelopmentUpdateInput;
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@pins/crowndev-database').Prisma.ContactGetPayload<{include: {Address: true}}>|null} contact
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
 * @returns {import('@pins/crowndev-database').Prisma.ContactUpdateOneWithoutCrownDevelopmentApplicantNestedInput|null}
 */
function viewModelToNestedContactUpdate(edits, prefix, viewModel) {
	/** @type {import('@pins/crowndev-database').Prisma.ContactCreateInput} */
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
	/** @type {import('@pins/crowndev-database').Prisma.ContactUpdateInput} */
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
 * Build nested updates for applicant organisation contacts.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput['Organisations']}
 */
function buildApplicantContactOrganisationUpdates(edits, viewModel) {
	const contacts = Array.isArray(edits.manageApplicantContactDetails) ? edits.manageApplicantContactDetails : [];
	if (contacts.length === 0) {
		return undefined;
	}

	// Map of organisationId -> relationId (CrownDevelopmentToOrganisation id)
	/** @type {Map<string, string>} */
	const orgIdToRelationId = new Map(
		(viewModel.manageApplicantDetails || [])
			.map(
				(organisation) =>
					/** @type {readonly [string, string]} */ ([organisation?.id, organisation?.organisationRelationId])
			)
			.filter((pair) => pair[0] && pair[1])
	);

	// Map of organisationToContactRelationId -> current organisationId + contactId
	// Used to support moving a contact to a different organisation without creating a new Contact.
	/** @type {Map<string, {organisationId: string, contactId: string}>} */
	const existingRelationToOrgAndContact = new Map(
		(viewModel.manageApplicantContactDetails || [])
			.map(
				(contact) =>
					/** @type {const} */ ([
						contact?.organisationToContactRelationId,
						{ organisationId: contact?.applicantContactOrganisation, contactId: contact?.id }
					])
			)
			.filter(
				(pair) =>
					typeof pair[0] === 'string' &&
					typeof pair[1]?.organisationId === 'string' &&
					typeof pair[1]?.contactId === 'string'
			)
	);

	/** @type {Map<string, {create: any[], deleteMany: any[]}>} */
	const byRelation = new Map();

	/**
	 * @typedef {Object} OrganisationRelationBucket
	 * @property {Array<{Role: {connect: {id: string}}, Contact: {create: any} | {connect: {id: string}}}>} create
	 * @property {Array<{id: string}>} deleteMany
	 */

	/**
	 * @param {string} relationId
	 * @returns {OrganisationRelationBucket}
	 */
	const ensureBucket = (relationId) => {
		if (!byRelation.has(relationId)) byRelation.set(relationId, { create: [], deleteMany: [] });
		const bucket = byRelation.get(relationId);
		if (!bucket) throw new Error('Failed to initialize bucket for organisation relation selector');
		return bucket;
	};

	for (const contact of contacts) {
		const targetOrganisationId = contact?.applicantContactOrganisation;
		if (!targetOrganisationId) {
			throw new Error('Unable to match applicant contact to organisation - no valid selector');
		}

		const targetRelationId = orgIdToRelationId.get(targetOrganisationId);
		if (!targetRelationId) {
			throw new Error(
				`Found an orphaned contact with selector "${targetOrganisationId}" that does not match any organisation on this case: ${contact?.applicantContactEmail}`
			);
		}

		const contactCreate = extractContactFields(contact);

		if (!contact.organisationToContactRelationId) {
			// (1) New contact: create join row + Contact
			ensureBucket(targetRelationId).create.push({
				Role: { connect: { id: CONTACT_ROLES_ID.APPLICANT } },
				Contact: { create: contactCreate }
			});
			continue;
		}

		// For existing contacts, ALWAYS determine the organisation that currently owns the join row
		// from the persisted view-model, not from the edited selector.
		const existing = existingRelationToOrgAndContact.get(contact.organisationToContactRelationId);
		if (!existing) {
			// If we don't recognise this join row, don't attempt any nested update (it may be under a different org).
			// Contact details will be handled by the separate $tx.contact.update step.
			continue;
		}

		const isChangingOrganisation = existing.organisationId !== targetOrganisationId;
		if (!isChangingOrganisation) {
			// (2) Details update only: no join-table change required; Contact update happens separately.
			continue;
		}

		// (3) Org change (and (4) org+details change): move the join row
		const sourceRelationId = orgIdToRelationId.get(existing.organisationId);
		if (!sourceRelationId) {
			throw new Error(
				`Unable to move contact - source organisation "${existing.organisationId}" is not present on this case`
			);
		}

		ensureBucket(sourceRelationId).deleteMany.push({ id: contact.organisationToContactRelationId });
		ensureBucket(targetRelationId).create.push({
			Role: { connect: { id: CONTACT_ROLES_ID.APPLICANT } },
			Contact: { connect: { id: existing.contactId } }
		});
	}

	const updateOperations = Array.from(byRelation.entries()).map(([relationId, operations]) => {
		/** @type {any} */
		const organisationToContact = {};
		if (operations.create.length) organisationToContact.create = operations.create;
		if (operations.deleteMany.length) organisationToContact.deleteMany = operations.deleteMany;

		return {
			where: { id: relationId },
			data: {
				Organisation: {
					update: {
						OrganisationToContact: organisationToContact
					}
				}
			}
		};
	});

	return { update: updateOperations };
}

/**
 * Populates LPA or secondary LPA contact and address fields in the view model using a prefix.
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@pins/crowndev-database').Prisma.LpaGetPayload<{include: {Address: true}}>|null|undefined} lpa
 * @param {'lpa' | 'secondaryLpa'} prefix - e.g. 'lpa' or 'secondaryLpa'
 */
function addLpaDetailsToViewModel(viewModel, lpa, prefix = 'lpa') {
	if (lpa) {
		viewModel[`${prefix}TelephoneNumber`] = lpa.telephoneNumber ?? undefined;
		viewModel[`${prefix}Email`] = lpa.email ?? undefined;
		if (lpa.Address) {
			viewModel[`${prefix}Address`] = addressToViewModel(lpa.Address);
		}
	}
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {import('@pins/crowndev-database').Prisma.EventGetPayload<{}>} event
 * @param {string|null} procedureId
 * @param {Date|null} [procedureNotificationDate]
 */
function addEventToViewModel(viewModel, event, procedureId, procedureNotificationDate) {
	const prefix = eventPrefix(procedureId);
	viewModel[`${prefix}ProcedureNotificationDate`] = procedureNotificationDate ?? undefined;
	viewModel[`${prefix}Date`] = event.date;
	viewModel[`${prefix}Venue`] = event.venue;
	viewModel[`${prefix}NotificationDate`] = event.notificationDate;
	viewModel[`${prefix}StatementsDate`] = event.statementsDate;
	viewModel[`${prefix}CaseManagementConferenceDate`] = event.caseManagementConferenceDate;
	viewModel[`${prefix}PreMeetingDate`] = event.preMeetingDate;

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
 * @returns {'inquiry' | 'hearing' | 'writtenReps'}
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
 * @returns {{eventUpdateInput: import('@pins/crowndev-database').Prisma.EventUpdateInput|null, procedureNotificationDate: Date|string|null}}
 */
function viewModelToEventUpdateInput(edits, procedureId) {
	/** @type {import('@pins/crowndev-database').Prisma.EventUpdateInput} */
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
	if (`${prefix}PreMeetingDate` in edits) {
		eventUpdateInput.preMeetingDate = edits[`${prefix}PreMeetingDate`];
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

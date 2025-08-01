import {
	booleanToYesNoValue,
	yesNoToBoolean
} from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import {
	CONTACT_PREFERENCE_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { optionalWhere } from '../../util/database.js';
import { addressToViewModel, viewModelToAddressUpdateInput } from '../../util/address.js';

/**
 * Representation fields that do not need mapping to a (or from) the view model
 * @type {Readonly<import('./types.js').HaveYourSayManageModelFields[]>}
 */
const UNMAPPED_VIEW_MODEL_FIELDS = Object.freeze([
	'reference',
	'statusId',
	'submittedDate',
	'categoryId',
	'submittedForId',
	'submittedByContactId',
	'representedContactId',
	'comment',
	'commentRedacted',
	'containsAttachments',
	'sharePointFolderCreated',
	'withdrawalRequestDate',
	'withdrawalReasonId',
	'dateWithdrawn'
]);

/**
 * @param {import('@prisma/client').Prisma.RepresentationGetPayload<{include: {SubmittedByContact: true, RepresentedContact: true}}>} representation
 * @param {string} [applicationReference]
 * @returns {import('./types.js').HaveYourSayManageModel}
 */
export function representationToManageViewModel(representation, applicationReference) {
	/** @type {import('./types.js').HaveYourSayManageModel} */
	const model = {
		applicationReference: applicationReference,
		requiresReview: representation.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
		submittedByAddressId: representation.SubmittedByContact?.addressId
	};

	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		model[field] = mapFieldValue(representation[field]);
	}

	if (representation.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF) {
		model.myselfFirstName = representation.SubmittedByContact?.firstName;
		model.myselfLastName = representation.SubmittedByContact?.lastName;
		model.myselfEmail = representation.SubmittedByContact?.email;
		model.myselfComment = representation.comment;
		model.myselfContactPreference = representation.SubmittedByContact?.contactPreferenceId;
		model.myselfAddress = addressToViewModel(representation.SubmittedByContact?.Address);
		model.myselfHearingPreference = mapFieldValue(representation.wantsToBeHeard);
		model.myselfContainsAttachments = mapFieldValue(representation.containsAttachments);
		model.myselfAttachments = representation.Attachments;
		model.myselfRedactedAttachments = mapRedactedAttachments(representation.Attachments);
	} else if (representation.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF) {
		model.representedTypeId = representation.representedTypeId;
		model.submitterFirstName = representation.SubmittedByContact?.firstName;
		model.submitterLastName = representation.SubmittedByContact?.lastName;
		model.submitterEmail = representation.SubmittedByContact?.email;
		model.submitterComment = representation.comment;
		model.submitterContactPreference = representation.SubmittedByContact?.contactPreferenceId;
		model.submitterAddress = addressToViewModel(representation.SubmittedByContact?.Address);
		model.submitterHearingPreference = mapFieldValue(representation.wantsToBeHeard);
		model.submitterContainsAttachments = mapFieldValue(representation.containsAttachments);
		model.submitterAttachments = representation.Attachments;
		model.submitterRedactedAttachments = mapRedactedAttachments(representation.Attachments);

		if (representation.representedTypeId === REPRESENTED_TYPE_ID.PERSON) {
			model.representedFirstName = representation.RepresentedContact?.firstName;
			model.representedLastName = representation.RepresentedContact?.lastName;
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION) {
			model.orgName = representation.RepresentedContact?.orgName;
			model.orgRoleName = representation.SubmittedByContact?.jobTitleOrRole;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR) {
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
			model.representedOrgName = representation.RepresentedContact?.orgName;
		}
	}

	model.withdrawalRequests = representation.WithdrawalRequests;

	return model;
}

function mapRedactedAttachments(attachments) {
	if (Array.isArray(attachments) && attachments.length > 0) {
		return attachments
			.filter((attachment) => attachment.redactedItemId && attachment.redactedFileName)
			.map((attachment) => {
				return { fileName: attachment.redactedFileName };
			});
	}

	return [];
}

/**
 * Answers/edits are received in 'view-model' form, and are mapped here to the appropriate database input.
 *
 * @param {import('./types.js').HaveYourSayManageModel} edits - edited fields only
 * @param {import('./types.js').HaveYourSayManageModel} viewModel - full view model with all case details
 * @returns {import('@prisma/client').Prisma.RepresentationUpdateInput}
 */
export function editsToDatabaseUpdates(edits, viewModel) {
	/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
	const representationUpdateInput = {};
	// map all the regular fields to the update input
	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		if (Object.hasOwn(edits, field)) {
			representationUpdateInput[field] = edits[field];
		}
	}
	// don't support updating these fields
	delete representationUpdateInput.reference;
	/** @type {import('@prisma/client').Prisma.ContactCreateWithoutRepresentationSubmittedByContactInput} */
	const submittedByContactUpdate = {};
	/** @type {import('@prisma/client').Prisma.ContactCreateWithoutRepresentationSubmittedByContactInput} */
	const representedContactUpdate = {};
	/** @type {import('@prisma/client').Prisma.AddressCreateWithoutContactInput} */
	let addressUpdate = {};

	// myself fields
	if ('myselfFirstName' in edits) {
		submittedByContactUpdate.firstName = edits.myselfFirstName;
	}
	if ('myselfLastName' in edits) {
		submittedByContactUpdate.lastName = edits.myselfLastName;
	}
	if ('myselfContactPreference' in edits) {
		submittedByContactUpdate.contactPreferenceId = edits.myselfContactPreference;
	}
	if ('myselfAddress' in edits) {
		addressUpdate = viewModelToAddressUpdateInput(edits.myselfAddress);
	}
	if ('myselfEmail' in edits) {
		submittedByContactUpdate.email = edits.myselfEmail;
	}
	if ('myselfComment' in edits) {
		representationUpdateInput.comment = edits.myselfComment;
	}
	if ('myselfContainsAttachments' in edits) {
		representationUpdateInput.containsAttachments = yesNoToBoolean(edits.myselfContainsAttachments);
	}
	if ('myselfHearingPreference' in edits) {
		representationUpdateInput.wantsToBeHeard = yesNoToBoolean(edits.myselfHearingPreference);
	}

	// common on behalf of fields
	if ('representedTypeId' in edits) {
		representationUpdateInput.representedTypeId = edits.representedTypeId;
	}
	if ('submitterFirstName' in edits) {
		submittedByContactUpdate.firstName = edits.submitterFirstName;
	}
	if ('submitterLastName' in edits) {
		submittedByContactUpdate.lastName = edits.submitterLastName;
	}
	if ('submitterContactPreference' in edits) {
		submittedByContactUpdate.contactPreferenceId = edits.submitterContactPreference;
	}
	if ('submitterAddress' in edits) {
		addressUpdate = viewModelToAddressUpdateInput(edits.submitterAddress);
	}
	if ('submitterEmail' in edits) {
		submittedByContactUpdate.email = edits.submitterEmail;
	}
	if ('submitterComment' in edits) {
		representationUpdateInput.comment = edits.submitterComment;
	}
	if ('submitterContainsAttachments' in edits) {
		representationUpdateInput.containsAttachments = yesNoToBoolean(edits.submitterContainsAttachments);
	}
	if ('submitterHearingPreference' in edits) {
		representationUpdateInput.wantsToBeHeard = yesNoToBoolean(edits.submitterHearingPreference);
	}

	// on behalf of org fields
	if ('orgName' in edits) {
		representedContactUpdate.orgName = edits.orgName;
	}
	if ('orgRoleName' in edits) {
		submittedByContactUpdate.jobTitleOrRole = edits.orgRoleName;
	}

	// on behalf of person for fields
	if ('representedFirstName' in edits) {
		representedContactUpdate.firstName = edits.representedFirstName;
	}
	if ('representedLastName' in edits) {
		representedContactUpdate.lastName = edits.representedLastName;
	}
	if ('isAgent' in edits) {
		representationUpdateInput.submittedByAgent = yesNoToBoolean(edits.isAgent);
	}
	if ('agentOrgName' in edits) {
		representationUpdateInput.submittedByAgentOrgName = edits.agentOrgName;
	}
	// on behalf of org not work for fields
	if ('representedOrgName' in edits) {
		representedContactUpdate.orgName = edits.representedOrgName;
	}

	if (Object.keys(addressUpdate).length > 0) {
		submittedByContactUpdate.Address = {
			create: addressUpdate
		};
	}
	if (Object.keys(submittedByContactUpdate).length > 0) {
		if (!viewModel.submittedByContactId) {
			representationUpdateInput.SubmittedByContact = {
				create: submittedByContactUpdate
			};
		} else {
			if (submittedByContactUpdate.Address) {
				const addressId = viewModel.submittedByAddressId;
				submittedByContactUpdate.Address = {
					upsert: {
						where: optionalWhere(addressId),
						create: addressUpdate,
						update: addressUpdate
					}
				};
			}
			representationUpdateInput.SubmittedByContact = {
				update: submittedByContactUpdate
			};
		}
	}
	if (Object.keys(representedContactUpdate).length > 0) {
		representationUpdateInput.RepresentedContact = {
			upsert: {
				where: optionalWhere(viewModel.representedContactId),
				create: representedContactUpdate,
				update: representedContactUpdate
			}
		};
	}
	return representationUpdateInput;
}

/**
 * @param {*} fieldValue
 * @returns {*|string}
 */
function mapFieldValue(fieldValue) {
	if (typeof fieldValue === 'boolean') {
		return booleanToYesNoValue(fieldValue);
	}
	return fieldValue;
}

/**
 *
 * @param {HaveYourSayManageModelFields} answers
 * @param {string} reference
 * @param {string} applicationId
 * @returns {import('@prisma/client').Prisma.RepresentationCreateInput}
 */
export function viewModelToRepresentationCreateInput(answers, reference, applicationId) {
	const isRepresentation =
		answers.representedTypeId === REPRESENTED_TYPE_ID.PERSON ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION;
	const representedIsAnOrganisation =
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR;
	const prefix = answers.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'submitter';

	const createInput = {
		reference,
		Application: { connect: { id: applicationId } },
		submittedDate: answers.submittedDate ?? new Date(),
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		SubmittedFor: { connect: { id: answers.submittedForId } },
		submittedByAgent: yesNoToBoolean(answers.isAgent) || false,
		comment: answers[`${prefix}Comment`],
		SubmittedByContact: {
			create: {
				email: answers[`${prefix}Email`],
				firstName: answers[`${prefix}FirstName`],
				lastName: answers[`${prefix}LastName`]
			}
		},
		containsAttachments: yesNoToBoolean(answers[`${prefix}ContainsAttachments`]) || false
	};

	if (answers[`${prefix}ContactPreference`]) {
		createInput.SubmittedByContact.create.ContactPreference = {
			connect: { id: answers[`${prefix}ContactPreference`] }
		};
	} else {
		createInput.SubmittedByContact.create.ContactPreference = {
			connect: { id: CONTACT_PREFERENCE_ID.EMAIL }
		};
	}

	if (answers[`${prefix}HearingPreference`]) {
		createInput.wantsToBeHeard = yesNoToBoolean(answers[`${prefix}HearingPreference`]);
	}

	// Checking that at least one of the address fields is not empty so that we don't create an empty address
	if (answers[`${prefix}Address`] && Object.values(answers[`${prefix}Address`]).some((value) => Boolean(value))) {
		const { addressLine1, addressLine2, townCity, county, postcode } = answers[`${prefix}Address`];
		// Using || to filter out empty strings
		createInput.SubmittedByContact.create.Address = {
			create: {
				line1: addressLine1 || null,
				line2: addressLine2 || null,
				townCity: townCity || null,
				county: county || null,
				postcode: postcode || null
			}
		};
	}

	if (answers.submittedDate) {
		createInput.submittedDate = answers.submittedDate;
	}

	createInput.Category = {
		connect: { id: answers.categoryId || 'interested-parties' }
	};

	if (yesNoToBoolean(answers.isAgent)) {
		createInput.submittedByAgentOrgName = answers.agentOrgName;
	}
	if (answers.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION) {
		createInput.SubmittedByContact.create.jobTitleOrRole = answers.orgRoleName;
	}
	if (isRepresentation) {
		createInput.RepresentedType = { connect: { id: answers.representedTypeId } };
		createInput.RepresentedContact = { create: {} };
		if (representedIsAnOrganisation) {
			createInput.RepresentedContact.create.orgName = answers.representedOrgName ?? answers.orgName;
		} else {
			createInput.RepresentedContact.create.firstName = answers.representedFirstName;
			createInput.RepresentedContact.create.lastName = answers.representedLastName;
		}
	}

	return createInput;
}

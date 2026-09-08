import {
	booleanToYesNoValue,
	yesNoToBoolean
} from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import {
	CONTACT_PREFERENCE_ID,
	RECEIVED_METHOD_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { optionalWhere } from '../../util/database.ts';
import { addressToViewModel, viewModelToAddressUpdateInput } from '../../util/address.ts';

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
	'dateWithdrawn',
	'submittedReceivedMethodId',
	'submissionMethodReason'
]);

/**
 * Unified mapper for both S62A and Crown Development representations.
 * Handles schema differences dynamically (e.g., RepresentedContact vs RepresentedContacts).
 *
 * Because this is a DB -> view model function, there isn't harm in combining the functions
 * as unneeded parameters will simply be ignored. This is different to anything destructive (saving)
 *
 * @param {import('@pins/crowndev-database').Prisma.RepresentationGetPayload<{include: {SubmittedByContact: true, RepresentedContact: true}}>} representation
 * @param {string} [applicationReference]
 * @returns {import('./types.js').HaveYourSayManageModel}
 */
export function representationToManageViewModel(representation, applicationReference) {
	/** @type {import('./types.js').HaveYourSayManageModel} */
	const model = {
		applicationReference: applicationReference,
		requiresReview: representation.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
		submittedByAddressId: representation.SubmittedByContact?.addressId,
		submittedReceivedMethodId: representation.submittedReceivedMethodId
	};

	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		model[field] = mapFieldValue(representation[field]);
	}
	model.submittedReceivedMethodId =
		model.submittedReceivedMethodId ?? representation.SubmittedReceivedMethod?.id ?? RECEIVED_METHOD_ID.ONLINE;
	model.distressingContentInRepresentation = mapFieldValue(representation.distressingContentInRepresentation);

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
		model.myselfBlobAttachments = representation.Attachments;
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
		model.submitterBlobAttachments = representation.Attachments;
		model.submitterRedactedAttachments = mapRedactedAttachments(representation.Attachments);

		const primaryRepresentedContact = representation.RepresentedContact || representation.RepresentedContacts?.[0];

		if (representation.representedTypeId === REPRESENTED_TYPE_ID.PERSON) {
			model.representedFirstName = primaryRepresentedContact?.firstName;
			model.representedLastName = primaryRepresentedContact?.lastName;
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION) {
			model.orgName = primaryRepresentedContact?.orgName;
			model.orgRoleName = representation.SubmittedByContact?.jobTitleOrRole;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR) {
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
			model.representedOrgName = primaryRepresentedContact?.orgName;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.GROUP) {
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
			model.groupName = representation.representedGroupName;
			const groupContacts =
				representation.RepresentedContacts ||
				(representation.RepresentedContact ? [representation.RepresentedContact] : []);
			model.manageGroupDetails = groupContacts.map((member) => ({
				groupRepresentedFirstName: member.firstName,
				groupRepresentedLastName: member.lastName
			}));
		}
	}

	model.withdrawalRequests = representation.WithdrawalRequests;

	return model;
}

export const s62aRepresentationToManageViewModel = representationToManageViewModel;

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
 * Extracts raw update payloads from the edits object.
 * This is schema-agnostic and non-destructive.
 */
export function extractEditPayloads(edits) {
	const primitiveUpdates = {};
	const submittedByContactUpdate = {};
	const representedContactUpdate = {};
	let addressUpdate = {};
	let groupMembersUpdate = null;

	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		if (Object.hasOwn(edits, field) && field !== 'reference') {
			primitiveUpdates[field] = edits[field];
		}
	}

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
		primitiveUpdates.comment = edits.myselfComment;
	}
	if ('myselfContainsAttachments' in edits) {
		primitiveUpdates.containsAttachments = yesNoToBoolean(edits.myselfContainsAttachments);
	}
	if ('myselfHearingPreference' in edits) {
		primitiveUpdates.wantsToBeHeard = yesNoToBoolean(edits.myselfHearingPreference);
	}

	// common on behalf of fields
	if ('representedTypeId' in edits) {
		primitiveUpdates.representedTypeId = edits.representedTypeId;
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
		primitiveUpdates.comment = edits.submitterComment;
	}
	if ('submitterContainsAttachments' in edits) {
		primitiveUpdates.containsAttachments = yesNoToBoolean(edits.submitterContainsAttachments);
	}
	if ('submitterHearingPreference' in edits) {
		primitiveUpdates.wantsToBeHeard = yesNoToBoolean(edits.submitterHearingPreference);
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
		primitiveUpdates.submittedByAgent = yesNoToBoolean(edits.isAgent);
	}
	if ('agentOrgName' in edits) {
		primitiveUpdates.submittedByAgentOrgName = edits.agentOrgName;
	}
	// on behalf of org not work for fields
	if ('representedOrgName' in edits) {
		representedContactUpdate.orgName = edits.representedOrgName;
	}

	// distressing content field
	if ('distressingContentInRepresentation' in edits) {
		primitiveUpdates.distressingContentInRepresentation = yesNoToBoolean(edits.distressingContentInRepresentation);
	}

	if (Object.keys(addressUpdate).length > 0) {
		submittedByContactUpdate.Address = {
			create: addressUpdate
		};
	}

	if ('groupName' in edits) {
		primitiveUpdates.representedGroupName = edits.groupName;
	}

	if ('manageGroupDetails' in edits) {
		groupMembersUpdate = (edits.manageGroupDetails || []).map((member) => ({
			id: member.id, // Assuming your UI/ViewModel passes the ID for existing rows
			firstName: member.groupRepresentedFirstName,
			lastName: member.groupRepresentedLastName
		}));
	}

	return {
		primitiveUpdates,
		submittedByContactUpdate,
		representedContactUpdate,
		addressUpdate,
		groupMembersUpdate
	};
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
 * @returns {import('@pins/crowndev-database').Prisma.RepresentationCreateInput}
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

	const createInput = getBaseRepresentationCreateInput(answers, reference, applicationId, prefix);

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

/**
 * Base create input, shared across Crown & S62A
 *
 * @param {HaveYourSayManageModelFields} answers
 * @param {string} reference
 * @param {string} applicationId
 * @param {string} prefix
 * @returns {import('@pins/crowndev-database').Prisma.RepresentationCreateInput}
 */
function getBaseRepresentationCreateInput(answers, reference, applicationId, prefix) {
	const createInput = {
		reference,
		Application: { connect: { id: applicationId } },
		submittedDate: answers.submittedDate ?? new Date(),
		SubmittedReceivedMethod: { connect: { id: RECEIVED_METHOD_ID.ONLINE } },
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

	if (answers.submittedReceivedMethodId) {
		createInput.SubmittedReceivedMethod = { connect: { id: answers.submittedReceivedMethodId } };
	}

	const submissionReason =
		answers.submissionMethodReason == null ? null : String(answers.submissionMethodReason).trim();

	if (submissionReason) {
		createInput.submissionMethodReason = submissionReason;
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

	return createInput;
}

/**
 * View model function for S62A representations, differs to Crown
 * by having a fourth option of submitting for a group of people.
 *
 * @param {HaveYourSayManageModelFields} answers
 * @param {string} reference
 * @param {string} applicationId
 * @returns {import('@pins/crowndev-database/src/client/client.ts').Prisma.S62aRepresentationCreateInput}
 */
export function viewModelToS62aRepresentationCreateInput(answers, reference, applicationId) {
	const isRepresentation =
		answers.representedTypeId === REPRESENTED_TYPE_ID.PERSON ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.GROUP;

	const representedIsAnOrganisation =
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION ||
		answers.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR;

	const prefix = answers.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'submitter';

	const createInput = getBaseRepresentationCreateInput(answers, reference, applicationId, prefix);

	if (isRepresentation) {
		createInput.RepresentedType = { connect: { id: answers.representedTypeId } };

		if (answers.representedTypeId === REPRESENTED_TYPE_ID.GROUP) {
			const members = answers.manageGroupDetails || [];

			createInput.RepresentedContacts = {
				create: members.map((member) => ({
					firstName: member.groupRepresentedFirstName,
					lastName: member.groupRepresentedLastName
				}))
			};

			createInput.representedGroupName = answers.groupName || undefined;
		} else {
			createInput.RepresentedContacts = { create: [{}] };
			if (representedIsAnOrganisation) {
				createInput.RepresentedContacts.create[0].orgName = answers.representedOrgName ?? answers.orgName;
			} else {
				createInput.RepresentedContacts.create[0].firstName = answers.representedFirstName;
				createInput.RepresentedContacts.create[0].lastName = answers.representedLastName;
			}
		}
	}

	return createInput;
}

/**
 * @param {import('./types.js').HaveYourSayManageModel} edits
 * @param {import('./types.js').HaveYourSayManageModel} viewModel
 * @returns {import('@pins/crowndev-database/src/client/client.ts').Prisma.S62aRepresentationUpdateInput}
 */
export function s62aEditsToDatabaseUpdates(edits, viewModel) {
	const payloads = extractEditPayloads(edits);

	/** @type {import('@pins/crowndev-database/src/client/client.ts').Prisma.S62aRepresentationUpdateInput} */
	const updateInput = { ...payloads.primitiveUpdates };

	if (Object.keys(payloads.submittedByContactUpdate).length > 0) {
		if (!viewModel.submittedByContactId) {
			updateInput.SubmittedByContact = { create: payloads.submittedByContactUpdate };
		} else {
			if (payloads.submittedByContactUpdate.Address) {
				payloads.submittedByContactUpdate.Address = {
					upsert: {
						where: optionalWhere(viewModel.submittedByAddressId),
						create: payloads.addressUpdate,
						update: payloads.addressUpdate
					}
				};
			}
			updateInput.SubmittedByContact = { update: payloads.submittedByContactUpdate };
		}
	}

	if (payloads.groupMembersUpdate) {
		const upsertOperations = [];
		const createOperations = [];
		const existingIdsToKeep = [];

		for (const member of payloads.groupMembersUpdate) {
			const memberData = {
				firstName: member.firstName || member.groupRepresentedFirstName,
				lastName: member.lastName || member.groupRepresentedLastName
			};

			if (member.id) {
				existingIdsToKeep.push(member.id);
				upsertOperations.push({
					where: { id: member.id },
					create: memberData,
					update: memberData
				});
			} else {
				createOperations.push(memberData);
			}
		}

		updateInput.RepresentedContacts = {};

		if (existingIdsToKeep.length > 0) {
			updateInput.RepresentedContacts.deleteMany = { id: { notIn: existingIdsToKeep } };
		} else if (payloads.groupMembersUpdate.length === 0) {
			updateInput.RepresentedContacts.deleteMany = {};
		}

		if (upsertOperations.length > 0) updateInput.RepresentedContacts.upsert = upsertOperations;
		if (createOperations.length > 0) updateInput.RepresentedContacts.create = createOperations;
	} else if (Object.keys(payloads.representedContactUpdate).length > 0) {
		updateInput.RepresentedContacts = {
			upsert: [
				{
					where: optionalWhere(viewModel.representedContactId),
					create: payloads.representedContactUpdate,
					update: payloads.representedContactUpdate
				}
			]
		};
	}

	return updateInput;
}

/**
 * @param {import('./types.js').HaveYourSayManageModel} edits
 * @param {import('./types.js').HaveYourSayManageModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.RepresentationUpdateInput}
 */
export function editsToDatabaseUpdates(edits, viewModel) {
	const payloads = extractEditPayloads(edits);

	/** @type {import('@pins/crowndev-database').Prisma.RepresentationUpdateInput} */
	const updateInput = { ...payloads.primitiveUpdates };

	if (Object.keys(payloads.submittedByContactUpdate).length > 0) {
		if (!viewModel.submittedByContactId) {
			updateInput.SubmittedByContact = { create: payloads.submittedByContactUpdate };
		} else {
			if (payloads.submittedByContactUpdate.Address) {
				payloads.submittedByContactUpdate.Address = {
					upsert: {
						where: optionalWhere(viewModel.submittedByAddressId),
						create: payloads.addressUpdate,
						update: payloads.addressUpdate
					}
				};
			}
			updateInput.SubmittedByContact = { update: payloads.submittedByContactUpdate };
		}
	}

	if (Object.keys(payloads.representedContactUpdate).length > 0) {
		updateInput.RepresentedContact = {
			upsert: {
				where: optionalWhere(viewModel.representedContactId),
				create: payloads.representedContactUpdate,
				update: payloads.representedContactUpdate
			}
		};
	}

	return updateInput;
}

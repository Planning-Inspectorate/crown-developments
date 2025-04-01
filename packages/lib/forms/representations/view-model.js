import { booleanToYesNoValue, yesNoToBoolean } from '@pins/dynamic-forms/src/components/boolean/question.js';
import {
	CONTACT_PREFERENCE_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { optionalWhere } from '../../util/database.js';

/**
 * Representation fields that do not need mapping to a (or from) the view model
 * @type {Readonly<import('./types.js').HaveYourSayManageModelFields[]>}
 */
const UNMAPPED_VIEW_MODEL_FIELDS = Object.freeze([
	'reference',
	'statusId',
	'submittedDate',
	'categoryId',
	'wantsToBeHeard',
	'submittedForId',
	'submittedByContactId',
	'representedContactId',
	'comment',
	'commentRedacted'
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
		model.myselfIsAdult = mapFieldValue(representation.SubmittedByContact?.isAdult);
		model.myselfFullName = representation.SubmittedByContact?.fullName;
		model.myselfEmail = representation.SubmittedByContact?.email;
		model.myselfComment = representation.comment;
		model.myselfContactPreference = representation.SubmittedByContact?.contactPreferenceId;
		model.myselfAddress = addressToViewModel(representation.SubmittedByContact?.Address);
	} else if (representation.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF) {
		model.representedTypeId = representation.representedTypeId;
		model.submitterIsAdult = mapFieldValue(representation.SubmittedByContact?.isAdult);
		model.submitterFullName = representation.SubmittedByContact?.fullName;
		model.submitterEmail = representation.SubmittedByContact?.email;
		model.submitterComment = representation.comment;
		model.submitterContactPreference = representation.SubmittedByContact?.contactPreferenceId;
		model.submitterAddress = addressToViewModel(representation.SubmittedByContact?.Address);

		if (representation.representedTypeId === REPRESENTED_TYPE_ID.PERSON) {
			model.representedIsAdult = mapFieldValue(representation.RepresentedContact?.isAdult);
			model.representedFullName = representation.RepresentedContact?.fullName;
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION) {
			model.orgName = representation.RepresentedContact?.fullName;
			model.orgRoleName = representation.SubmittedByContact?.jobTitleOrRole;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR) {
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
			model.representedOrgName = representation.RepresentedContact?.fullName;
		}
	}
	return model;
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

	if ('wantsToBeHeard' in edits) {
		representationUpdateInput.wantsToBeHeard = yesNoToBoolean(edits.wantsToBeHeard);
	}

	// myself fields
	if ('myselfIsAdult' in edits) {
		submittedByContactUpdate.isAdult = yesNoToBoolean(edits.myselfIsAdult);
	}
	if ('myselfFullName' in edits) {
		submittedByContactUpdate.fullName = edits.myselfFullName;
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

	// common on behalf of fields
	if ('representedTypeId' in edits) {
		representationUpdateInput.representedTypeId = edits.representedTypeId;
	}
	if ('submitterIsAdult' in edits) {
		submittedByContactUpdate.isAdult = yesNoToBoolean(edits.submitterIsAdult);
	}
	if ('submitterFullName' in edits) {
		submittedByContactUpdate.fullName = edits.submitterFullName;
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

	// on behalf of org fields
	if ('orgName' in edits) {
		representedContactUpdate.fullName = edits.orgName;
	}
	if ('orgRoleName' in edits) {
		representedContactUpdate.jobTitleOrRole = edits.orgRoleName;
	}

	// on behalf of person for fields
	if ('representedIsAdult' in edits) {
		representedContactUpdate.isAdult = yesNoToBoolean(edits.representedIsAdult);
	}
	if ('representedFullName' in edits) {
		representedContactUpdate.fullName = edits.representedFullName;
	}
	if ('isAgent' in edits) {
		representationUpdateInput.submittedByAgent = yesNoToBoolean(edits.isAgent);
	}
	if ('agentOrgName' in edits) {
		representationUpdateInput.submittedByAgentOrgName = edits.agentOrgName;
	}
	// on behalf of org not work for fields
	if ('representedOrgName' in edits) {
		representedContactUpdate.fullName = edits.representedOrgName;
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
	const submitterIsAdult = yesNoToBoolean(answers[`${prefix}IsAdult`]);
	const representedIsAdult = yesNoToBoolean(answers.representedIsAdult);

	const createInput = {
		reference,
		Application: { connect: { id: applicationId } },
		submittedDate: answers.submittedDate ?? new Date(),
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		SubmittedFor: { connect: { id: answers.submittedForId } },
		submittedByAgent: yesNoToBoolean(answers.areYouAgent) || false,
		comment: answers[`${prefix}Comment`],
		SubmittedByContact: {
			create: {
				isAdult: submitterIsAdult,
				email: answers[`${prefix}Email`]
			}
		}
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

	if (answers.categoryId) {
		createInput.Category = { connect: { id: answers.categoryId } };
	}

	if (submitterIsAdult) {
		createInput.SubmittedByContact.create.fullName = answers[`${prefix}FullName`];
	}
	if (yesNoToBoolean(answers.areYouAgent)) {
		createInput.submittedByAgentOrgName = answers.agentOrgName;
	}
	if (answers.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION) {
		createInput.SubmittedByContact.create.jobTitleOrRole = answers.orgRoleName;
	}
	if (isRepresentation) {
		createInput.RepresentedType = { connect: { id: answers.representedTypeId } };
		createInput.RepresentedContact = { create: {} };
		if (representedIsAnOrganisation) {
			createInput.RepresentedContact.create.fullName = answers.representedOrgName ?? answers.orgName;
		} else {
			createInput.RepresentedContact.create.isAdult = representedIsAdult;
			if (representedIsAdult) {
				createInput.RepresentedContact.create.fullName = answers.representedFullName;
			}
		}
	}

	return createInput;
}

/**
 * @param {import('@prisma/client').Prisma.AddressGetPayload<{}>} address
 * @returns {import('@pins/dynamic-forms/src/lib/address.js').Address}
 */
function addressToViewModel(address) {
	if (address) {
		return {
			id: address.id,
			addressLine1: address.line1,
			addressLine2: address.line2,
			townCity: address.townCity,
			county: address.county,
			postcode: address.postcode
		};
	}
	return {};
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

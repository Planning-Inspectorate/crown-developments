import { booleanToYesNoValue } from '@pins/dynamic-forms/src/components/boolean/question.js';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';

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
	'submittedForId'
]);

/**
 * @param {import('@prisma/client').Prisma.RepresentationGetPayload<{include: {SubmittedByContact: true, RepresentedContact: true}}>} representation
 * @param {string} [applicationReference]
 * @returns {import('./types.js').HaveYourSayManageModel}
 */
export function representationToManageViewModel(representation, applicationReference) {
	/** @type {import('./types.js').HaveYourSayManageModel} */
	const model = {};

	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		model[field] = mapFieldValue(representation[field]);
	}
	model.applicationReference = applicationReference;
	model.requiresReview = representation.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW;

	if (representation.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF) {
		model.myselfIsAdult = mapFieldValue(representation.SubmittedByContact?.isAdult);
		model.myselfFullName = representation.SubmittedByContact?.fullName;
		model.myselfEmail = representation.SubmittedByContact?.email;
		model.myselfComment = representation.comment;
	} else if (representation.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF) {
		model.representedTypeId = representation.representedTypeId;
		model.submitterIsAdult = mapFieldValue(representation.SubmittedByContact?.isAdult);
		model.submitterFullName = representation.SubmittedByContact?.fullName;
		model.submitterEmail = representation.SubmittedByContact?.email;
		model.submitterComment = representation.comment;

		if (representation.representedTypeId === REPRESENTED_TYPE_ID.PERSON) {
			model.representedIsAdult = mapFieldValue(representation.RepresentedContact?.isAdult);
			model.representedFullName = representation.RepresentedContact?.fullName;
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION) {
			model.orgName = representation.RepresentedContact?.fullName;
			model.orgRoleName = representation.RepresentedContact?.jobTitleOrRole;
		} else if (representation.representedTypeId === REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR) {
			model.isAgent = mapFieldValue(representation.submittedByAgent);
			model.agentOrgName = representation.submittedByAgentOrgName;
			model.representedOrgName = representation.RepresentedContact?.fullName;
		}
	}
	return model;
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

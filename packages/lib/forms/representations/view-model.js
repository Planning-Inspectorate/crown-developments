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
 * @returns {import('./types.js').HaveYourSayManageModel}
 */
export function representationToManageViewModel(representation) {
	/** @type {import('./types.js').HaveYourSayManageModel} */
	const model = {};

	for (const field of UNMAPPED_VIEW_MODEL_FIELDS) {
		model[field] = mapFieldValue(representation[field]);
	}

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

/**
 *
 * @param {RepresentationCreateAnswers} answers
 * @param {string} reference
 * @param {string} applicationId
 * @returns {import('@prisma/client').Prisma.RepresentationUncheckedCreateInput}
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

	const submitterIsAdult = answers[`${prefix}IsAdult`] === 'yes';
	const representedIsAdult = answers.representedIsAdult === 'yes';

	return {
		reference,
		Application: { connect: { id: applicationId } },
		submittedDate: answers.submittedDate ?? new Date(),
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		SubmittedFor: { connect: { id: answers.submittedForId } },
		...(!!answers.agentOrgName && { submittedByAgentOrgName: answers.agentOrgName }),
		submittedByAgent: mapYesNoToBoolean(answers.areYouAgent) || false,
		comment: answers[`${prefix}Comment`],
		SubmittedByContact: {
			create: {
				...(!!submitterIsAdult && { fullName: answers[`${prefix}FullName`] }),
				...(!!submitterIsAdult && { email: answers[`${prefix}Email`] }),
				isAdult: mapYesNoToBoolean(answers[`${prefix}IsAdult`]),
				...(answers.orgRoleName && { jobTitleOrRole: answers.orgRoleName })
			}
		},
		...(!!isRepresentation && { RepresentedType: { connect: { id: answers.representedTypeId } } }),
		...(!!isRepresentation && {
			RepresentedContact: {
				create: {
					// Adds this if it's a person regardless of being over 18
					...(!representedIsAnOrganisation && { isAdult: mapYesNoToBoolean(answers.representedIsAdult) }),
					// Only add this if over 18
					...(!!representedIsAdult && { fullName: answers.representedFullName }),
					// Adds this if it's an organisation
					...(!!representedIsAnOrganisation && { fullName: answers.representedOrgName ?? answers.orgName })
				}
			}
		})
	};
}

/**
 * @param {*} value
 * @returns {*|boolean}
 */
function mapYesNoToBoolean(value) {
	if (value === 'yes' || value === 'no') {
		return value === 'yes';
	}
	return value;
}

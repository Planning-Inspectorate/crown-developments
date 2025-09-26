import { getAnswers } from '@pins/crowndev-lib/util/answers.js';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

export function getLinkedCaseId(crownDevelopment) {
	return crownDevelopment?.linkedParentId || crownDevelopment?.ChildrenCrownDevelopment?.find(() => true)?.id;
}

export function hasLinkedCase(crownDevelopment) {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	return typeof linkedCaseId === 'string' && linkedCaseId.trim() !== '';
}

export async function linkedCaseIsPublished(db, crownDevelopment) {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	const linkedCase = await db.crownDevelopment.findUnique({
		where: { id: linkedCaseId },
		select: { publishDate: true }
	});
	const publishDate = linkedCase?.publishDate;
	return Boolean(publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate)));
}

export async function getLinkedCaseLinkText(db, crownDevelopment) {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	const linkedCase = await db.crownDevelopment.findUnique({
		where: { id: linkedCaseId },
		select: { subTypeId: true }
	});

	return linkedCase?.subTypeId === APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION
		? 'planning permission'
		: 'Listed Building Consent (LBC)';
}

export function getSummaryWarningMessage(res) {
	const answers = getAnswers(res);
	return answers?.typeOfApplication === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
		? 'Clicking accept & submit will create a second case as part of the connected application'
		: 'Clicking Accept & Submit will send a notification to the applicant / agent';
}

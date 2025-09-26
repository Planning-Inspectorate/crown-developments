import { getAnswers } from '@pins/crowndev-lib/util/answers.js';
import { APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function getSummaryWarningMessage(res) {
	const answers = getAnswers(res);
	return answers?.typeOfApplication === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
		? 'Clicking accept & submit will create a second case as part of the connected application'
		: 'Clicking Accept & Submit will send a notification to the applicant / agent';
}

export function getLinkedCaseId(crownDevelopment) {
	return crownDevelopment?.linkedParentId || crownDevelopment?.ChildrenCrownDevelopment?.find(() => true)?.id;
}

export function hasLinkedCase(crownDevelopment) {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	return typeof linkedCaseId === 'string' && linkedCaseId.trim() !== '';
}

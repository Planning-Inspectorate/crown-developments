import type { S62aCaseViewModel } from '../view/view-model.ts';

/**
 * The site visit details that depend on the site visit type: an access
 * required site visit has a date and times, an unaccompanied one a date only.
 */
export const SITE_VISIT_SCHEDULE_FIELDS = Object.freeze([
	'siteVisitDate',
	'siteVisitStartTime',
	'siteVisitEndTime'
] as const);

type SiteVisitScheduleField = (typeof SITE_VISIT_SCHEDULE_FIELDS)[number];

/**
 * When the site visit type is changed, the saved date and times no longer
 * apply, so they're cleared and the case officer adds them again.
 *
 * Only fields that have a value are returned, so clearing them is audited
 * without empty "- to -" entries.
 */
export function siteVisitAnswersToClear(
	answers: { siteVisitTypeId?: string | null },
	previousCase: Pick<S62aCaseViewModel, 'siteVisitTypeId' | SiteVisitScheduleField>
): Partial<Record<SiteVisitScheduleField, null>> {
	if (answers.siteVisitTypeId === undefined) {
		return {};
	}
	if ((answers.siteVisitTypeId || null) === (previousCase.siteVisitTypeId || null)) {
		return {};
	}

	const cleared: Partial<Record<SiteVisitScheduleField, null>> = {};
	for (const field of SITE_VISIT_SCHEDULE_FIELDS) {
		if (previousCase[field]) {
			cleared[field] = null;
		}
	}
	return cleared;
}

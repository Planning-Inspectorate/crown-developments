import {
	dateIsAfterToday,
	dateIsToday,
	isNowAfterStartDate,
	nowIsWithinRange
} from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

export const HAVE_YOUR_SAY_STATUS = {
	OPEN: 'open',
	NOT_OPEN_DATES_SET: 'notOpenDatesSet',
	NOT_OPEN_DATES_NOT_SET: 'notOpenDatesNotSet',
	CLOSED_REPS_PUBLISHED: 'closedRepsPublished',
	CLOSED_REPS_PUBLISHED_IN_FUTURE: 'closedPublishedDateInFuture',
	CLOSED_REPS_PUBLISHED_DATE_NOT_SET: 'closedRepsPublishedDateNotSet'
};

export function getHaveYourSayStatus(haveYourSayPeriod, representationsPublishDate) {
	const start = haveYourSayPeriod?.start;
	const end = haveYourSayPeriod?.end;

	if (nowIsWithinRange(start, end)) {
		return HAVE_YOUR_SAY_STATUS.OPEN;
	}

	if (dateIsAfterToday(start)) {
		return HAVE_YOUR_SAY_STATUS.NOT_OPEN_DATES_SET;
	}

	if (!start && !end) {
		return HAVE_YOUR_SAY_STATUS.NOT_OPEN_DATES_NOT_SET;
	}

	const isAfterRepresentationsPeriodEndDate = isNowAfterStartDate(end);
	const repsDateIsTodayOrPast =
		dateIsToday(representationsPublishDate) || isNowAfterStartDate(representationsPublishDate);
	const repsDateIsFuture = dateIsAfterToday(representationsPublishDate);

	if (isAfterRepresentationsPeriodEndDate && repsDateIsTodayOrPast) {
		return HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED;
	}

	if (isAfterRepresentationsPeriodEndDate && repsDateIsFuture) {
		return HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED_IN_FUTURE;
	}

	return HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED_DATE_NOT_SET;
}

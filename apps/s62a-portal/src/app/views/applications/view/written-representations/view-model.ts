import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { type ApplicationPublishStatus, getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';
import { dateIsBeforeToday, dateIsAfterToday } from '@planning-inspectorate/dynamic-forms';

export type S62aCaseWithRelations = Prisma.S62aCaseGetPayload<{
	include: {
		S62aDates: true;
	};
}>;

export type S62aCaseView = {
	id: string;
	reference: string;
	applicationStatus?: ApplicationPublishStatus;
};

function formatDateTime(date: Date): string {
	const day = date.getDate().toString().padStart(2, '0');
	const month = date.toLocaleString('en-GB', { month: 'long' });
	const time = date
		.toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
		.toLowerCase()
		.replace(' ', '');

	return `${day} ${month} ${time}`;
}

type RepresentationFields = {
	representationsPeriodStartDate?: Date | null;
	representationsPeriodEndDate?: Date | null;
	representationsPublishDate?: Date | null;
};

/*
 * Function to return correct representation page menu copy when no published representations are present
 */
export function representationMessages(
	representationFields: RepresentationFields,
	hasAcceptedRepresentations: boolean = false,
	representationsSubmitted: boolean = false
): string[] {
	const messages: string[] = [];

	const startDate = representationFields.representationsPeriodStartDate;
	const endDate = representationFields.representationsPeriodEndDate;
	const publishDate = representationFields.representationsPublishDate;

	const now = new Date();

	const isPeriodNotYetOpen = startDate ? dateIsAfterToday(startDate) : false;
	const isPeriodOpen = startDate && endDate ? now >= startDate && now <= endDate : false;
	const isPeriodClosed = endDate ? dateIsBeforeToday(endDate) : false;

	if (isPeriodNotYetOpen || (!startDate && !endDate)) {
		messages.push('No written representations have been published yet.');

		if (!startDate && !endDate) {
			// A. Representation period not yet open & No representation period dates set
			messages.push(
				'You can submit a written representation (also known as ‘Have your say’) when the representation period is announced and open.'
			);
		} else if (startDate && endDate) {
			// B. Representation period not yet open & Representation period dates set in the future
			const formattedStart = formatDateTime(startDate);
			const formattedEnd = formatDateTime(endDate);
			messages.push(
				`You can submit a written representation (also known as ‘Have your say’) from: ${formattedStart} - ${formattedEnd}`
			);
		}
		return messages;
	}

	if (isPeriodOpen) {
		if (!representationsSubmitted) {
			//C. Representation period open & No representations have been submitted
			messages.push('No written representations have been submitted yet.');
			return messages;
		}

		if (!hasAcceptedRepresentations) {
			//D. Representation period open & Representations have been submitted but they are still in ‘Awaiting review' || F. &  Representation period open & Representations have been submitted but all are rejected
			messages.push('No written representations have been published yet.');
			messages.push(
				'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
			);
			return messages;
		}

		if (hasAcceptedRepresentations) {
			messages.push('No written representations have been published yet.');
			if (!publishDate) {
				//G. Representation period open  & Representations have been submitted and there is at least 1 accepted & Representations publish date not yet set
				messages.push('We’ll update this page once the date to publish representations has been set.');
			} else if (dateIsAfterToday(publishDate)) {
				//H. Representation period open  & Representations have been submitted and there is at least 1 accepted & Representations publish date in future
				const formattedPublishDate = publishDate.toLocaleDateString('en-GB', {
					day: '2-digit',
					month: 'long',
					year: 'numeric'
				});
				messages.push(`You’ll be able to view the published representations from ${formattedPublishDate}`);
			}
			return messages;
		}
	}

	if (isPeriodClosed) {
		if (!hasAcceptedRepresentations) {
			//J. Representation period closed & Representations submitted all rejected or in awaiting review & Representations publish date is in the past
			messages.push('No written representations have been published yet.');
			messages.push(
				'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
			);
			return messages;
		}

		if (hasAcceptedRepresentations && publishDate && !dateIsAfterToday(publishDate)) {
			//K. Representation period closed & Representations have been submitted and there is at least 1 accepted & Representations publish date is in the past
			return [];
		}
	}

	return messages;
}

export function s62aCaseToViewModel(s62aCase: S62aCaseWithRelations): S62aCaseView {
	const fields = {
		id: s62aCase.id,
		reference: s62aCase.reference
	} as S62aCaseView;

	if (s62aCase.S62aDates && 'withdrawnDate' in s62aCase.S62aDates) {
		fields.applicationStatus = getApplicationStatus(s62aCase.S62aDates.withdrawnDate);
	}

	return fields;
}

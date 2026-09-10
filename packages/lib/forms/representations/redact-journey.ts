import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import TextEntryRedactQuestion from '@planning-inspectorate/dynamic-forms/src/components/text-entry-redact/question.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Request } from 'express';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

export function createRedactJourney(response: JourneyResponse, journeyId: string, req: Request) {
	if (!req.baseUrl.includes('/manage-representations/')) {
		throw new Error(`not a valid request for the ${journeyId} journey`);
	}

	return new Journey({
		journeyId,
		sections: [
			new Section('Section 1', 'questions').addQuestion(
				new TextEntryRedactQuestion({
					fieldName: 'comment',
					url: 'redact',
					question: 'Redact representation',
					title: 'Redact representation',
					summaryText: 'Original representation',
					showSuggestionsUi: true
				})
			)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/cases/view/manage-reps/view/view.njk',
		journeyTitle:
			response.answers?.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
				? 'Review Representation'
				: 'View Representation',
		initialBackLink: req.originalUrl?.replace('/redact', ''),
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}

import { Section } from '@pins/dynamic-forms/src/section.js';
import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { questionHasAnswer } from '@pins/dynamic-forms/src/components/utils/question-has-answer.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import TextEntryRedactQuestion from '@pins/dynamic-forms/src/components/text-entry-redact/question.js';

export const JOURNEY_ID = 'manage-representations';

/**
 * @param {{[questionType: string]: import('@pins/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createJourney(questions, response, req) {
	if (!req.baseUrl.includes('/' + JOURNEY_ID + '/')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Section 1', 'questions')
				.addQuestion(questions.reference)
				.addQuestion(questions.status)
				.addQuestion(questions.submittedFor)
				.addQuestion(questions.fullName)
				.addQuestion(questions.isAdult)
				.addQuestion(questions.email)
				.addQuestion(questions.address)
				.addQuestion(questions.comment)
				.addQuestion(questions.commentRedacted)
				.withCondition(
					(response) => !questionHasAnswer(response, questions.status, REPRESENTATION_STATUS_ID.AWAITING_REVIEW)
				)
				.addQuestion(questions.wantsToBeHeard)
				.withCondition(
					(response) => !questionHasAnswer(response, questions.status, REPRESENTATION_STATUS_ID.AWAITING_REVIEW)
				)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/cases/view/manage-reps/view/manage-rep.njk',
		journeyTitle: 'Manage Rep',
		returnToListing: true,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}

/**
 * @param {{[questionType: string]: import('@pins/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createRedactJourney(response, req) {
	if (!req.baseUrl.includes('/' + JOURNEY_ID + '/')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Section 1', 'questions').addQuestion(
				new TextEntryRedactQuestion({
					fieldName: 'comment',
					url: 'redact',
					question: 'Redact comment',
					title: 'Redact comment'
				})
			)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/cases/view/manage-reps/view/manage-rep.njk',
		journeyTitle: 'Manage Rep',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}

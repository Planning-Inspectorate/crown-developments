import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { redirectToUnansweredQuestion } from './redirect-to-unanswered-question.js';

import { JourneyResponse } from '../journey/journey-response.js';
import { Journey } from '../journey/journey.js';
import { Section } from '../section.js';
import { COMPONENT_TYPES } from '../index.js';
import { questionHasAnswer } from '../components/utils/question-has-answer.js';

describe('redirectToUnansweredQuestion Middleware', () => {
	const questions = {
		q1: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Question 1?',
			question: 'Question 1?',
			fieldName: 'questionOne',
			url: 'question-1',
			validators: []
		},
		q2: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Question 2?',
			question: 'Question 2?',
			fieldName: 'questionTwo',
			url: 'question-2',
			validators: []
		},
		q3: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Question 3?',
			question: 'Question 3?',
			fieldName: 'questionThree',
			url: 'question-3',
			validators: []
		},
		q4: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Question 4?',
			question: 'Question 4?',
			fieldName: 'questionFour',
			url: 'question-4',
			validators: []
		}
	};
	const params = {
		journeyId: 'id-1',
		journeyTemplate: 'statement-template.njk',
		listingPageViewPath: 'dynamic-components/task-list/statement',
		journeyTitle: 'Manage your appeals',
		sections: [
			new Section('', 'section-1')
				.addQuestion(questions.q1)
				.addQuestion(questions.q2)
				.addQuestion(questions.q3)
				.withCondition((response) => questionHasAnswer(response, questions.q2, true))
				.addQuestion(questions.q4)
		],
		taskListUrl: 'task-list/page',
		makeBaseUrl: () => 'base/url'
	};
	let req, res, next;
	beforeEach(() => {
		req = {
			params: {}
		};
		res = {
			redirect: mock.fn(),
			locals: {}
		};
		next = mock.fn();
	});
	it('should redirect to the first unanswered question', () => {
		const journeyResponse = new JourneyResponse('id-1', '0000003', {}, 'Q9999');
		res.locals.journeyResponse = journeyResponse;
		const journey = new Journey({ response: journeyResponse, ...params });
		res.locals.journey = journey;

		// Passing in array of no conditions, redirects to first unanswered question
		redirectToUnansweredQuestion([])(req, res, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['base/url/section-1/question-1']);
		assert.strictEqual(next.mock.callCount(), 0);
	});
	it('should redirect to the second question if first is answered', () => {
		const journeyResponse = new JourneyResponse(
			'id-1',
			'0000003',
			{
				questionOne: true
			},
			'Q9999'
		);
		res.locals.journeyResponse = journeyResponse;
		const journey = new Journey({ response: journeyResponse, ...params });
		res.locals.journey = journey;

		redirectToUnansweredQuestion([])(req, res, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['base/url/section-1/question-2']);
		assert.strictEqual(next.mock.callCount(), 0);
	});

	it('should skip the third question if the second question is answered with "no"', () => {
		const journeyResponse = new JourneyResponse(
			'id-1',
			'0000003',
			{
				questionOne: true,
				questionTwo: false
			},
			'Q9999'
		);
		res.locals.journeyResponse = journeyResponse;
		const journey = new Journey({ response: journeyResponse, ...params });
		res.locals.journey = journey;

		redirectToUnansweredQuestion([])(req, res, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['base/url/section-1/question-4']);
		assert.strictEqual(next.mock.callCount(), 0);
	});

	it('should redirect to task list if all questions are answered', () => {
		const journeyResponse = new JourneyResponse(
			'id-1',
			'0000003',
			{
				questionOne: true,
				questionTwo: false,
				questionFour: true
			},
			'Q9999'
		);
		res.locals.journeyResponse = journeyResponse;
		const journey = new Journey({ response: journeyResponse, ...params });
		res.locals.journey = journey;

		redirectToUnansweredQuestion([])(req, res, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['base/url/task-list/page']);
		assert.strictEqual(next.mock.callCount(), 0);
	});
});

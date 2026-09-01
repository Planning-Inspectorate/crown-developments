import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createJourney } from './journey.js';

describe('journey', () => {
	it('should set base url as /edit', () => {
		const questions = getQuestions();
		const journey = createJourney(
			questions,
			{},
			{
				baseUrl: '/manage-representations/rep-1'
			}
		);
		assert.strictEqual(journey.baseUrl, '/manage-representations/rep-1/edit');
	});
	it('should remove /review from the URL', () => {
		const questions = getQuestions();
		const journey = createJourney(
			questions,
			{},
			{
				baseUrl: '/manage-representations/rep-1/review'
			}
		);
		assert.strictEqual(journey.baseUrl, '/manage-representations/rep-1/edit');
	});
});

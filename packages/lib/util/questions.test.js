import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getSubmittedForId, truncateComment, truncatedReadMoreCommentLink } from './questions.js';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('questions', () => {
	describe('truncateComment', () => {
		it('should truncate comment if it exceeds 500 characters', () => {
			const comment =
				'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. Johnathan Le-Smithard adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; Johnathan Le-Smithard wrote in his notebook, letting the day delay his errands, wholly unhurried and serene.';

			assert.deepEqual(
				truncateComment(comment),
				'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. Johnathan Le-Smithard adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; Johnathan Le-Smithard wrote in his notebook, letting the day delay his errands, who... '
			);
		});
		it('should not truncate comment if it does not exceed 500 characters', () => {
			assert.deepEqual(truncateComment('a short comment'), 'a short comment');
		});
	});
	describe('truncatedReadMoreCommentLink', () => {
		it('should return the html link for the href link provided', () => {
			assert.deepEqual(
				truncatedReadMoreCommentLink('written-representations/ABCDE-1234'),
				'<a class="govuk-link govuk-link--no-visited-state" href="written-representations/ABCDE-1234">Read more</a>'
			);
		});
	});
	describe('getSubmittedForId', () => {
		it('should return myself if submittedForId is myself', () => {
			assert.deepEqual(
				getSubmittedForId({ submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF }),
				REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
			);
		});
		it('should return on-behalf-of if submittedForId is on-behalf-of', () => {
			assert.deepEqual(
				getSubmittedForId({ submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF }),
				REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
			);
		});
		it('should return on-behalf-of by default', () => {
			assert.deepEqual(getSubmittedForId({}), REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF);
		});
	});
});

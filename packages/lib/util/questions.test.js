import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	getSubmittedForId,
	referenceDataToRadioOptions,
	referenceDataToRadioOptionsWithHintText,
	shouldTruncateComment,
	truncateComment,
	truncatedReadMoreCommentLink
} from './questions.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, WITHDRAWAL_REASON } from '@pins/crowndev-database/src/seed/data-static.js';

describe('questions', () => {
	describe('shouldTruncateComment', () => {
		it('should return true if comment is greater 500 chars', () => {
			const comment =
				'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. Johnathan Le-Smithard adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; Johnathan Le-Smithard wrote in his notebook, letting the day delay his errands, wholly unhurried and serene.';

			assert.deepEqual(shouldTruncateComment(comment), true);
		});
		it('should return false if comment does not exceed 500 characters', () => {
			assert.deepEqual(shouldTruncateComment('a short comment'), false);
		});
		it('should return false if comment passed is null', () => {
			assert.deepEqual(shouldTruncateComment(null), false);
		});
		it('should return false if comment passed is undefined', () => {
			assert.deepEqual(shouldTruncateComment(undefined), false);
		});
	});
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
	describe('referenceDataToRadioOptionsWithHintText', () => {
		it('should return radio options with hint text from reference data', () => {
			const radioOptions = referenceDataToRadioOptionsWithHintText(WITHDRAWAL_REASON);
			assert.deepStrictEqual(radioOptions, [
				{
					text: 'Change of opinion',
					value: 'change-of-opinion',
					hint: {
						text: 'They no longer feel the same way about the application'
					}
				},
				{
					text: 'Mistaken Submission',
					value: 'mistaken-submission',
					hint: {
						text: 'They accidentally submitted the representation'
					}
				},
				{
					text: 'Misunderstanding',
					value: 'misunderstanding',
					hint: {
						text: 'They misunderstood the application or its implications'
					}
				},
				{
					text: 'Personal Reasons',
					value: 'personal-reasons',
					hint: {
						text: 'Such as privacy or a change in circumstances'
					}
				}
			]);
		});
		it('should allow for a null option', () => {
			const radioOptions = referenceDataToRadioOptionsWithHintText(WITHDRAWAL_REASON, true);
			assert.deepStrictEqual(radioOptions, [
				{
					text: '',
					value: '',
					hint: {
						text: ''
					}
				},
				{
					text: 'Change of opinion',
					value: 'change-of-opinion',
					hint: {
						text: 'They no longer feel the same way about the application'
					}
				},
				{
					text: 'Mistaken Submission',
					value: 'mistaken-submission',
					hint: {
						text: 'They accidentally submitted the representation'
					}
				},
				{
					text: 'Misunderstanding',
					value: 'misunderstanding',
					hint: {
						text: 'They misunderstood the application or its implications'
					}
				},
				{
					text: 'Personal Reasons',
					value: 'personal-reasons',
					hint: {
						text: 'Such as privacy or a change in circumstances'
					}
				}
			]);
		});
	});
	describe('referenceDateToRadioOptions', () => {
		it('should return radio options from reference data', () => {
			const radioOptions = referenceDataToRadioOptions(WITHDRAWAL_REASON, false);
			assert.deepStrictEqual(radioOptions, [
				{
					text: 'Change of opinion',
					value: 'change-of-opinion'
				},
				{
					text: 'Mistaken Submission',
					value: 'mistaken-submission'
				},
				{
					text: 'Misunderstanding',
					value: 'misunderstanding'
				},
				{
					text: 'Personal Reasons',
					value: 'personal-reasons'
				}
			]);
		});
		it('should allow for a null option', () => {
			const radioOptions = referenceDataToRadioOptions(WITHDRAWAL_REASON, true);
			assert.deepStrictEqual(radioOptions, [
				{
					text: '',
					value: ''
				},
				{
					text: 'Change of opinion',
					value: 'change-of-opinion'
				},
				{
					text: 'Mistaken Submission',
					value: 'mistaken-submission'
				},
				{
					text: 'Misunderstanding',
					value: 'misunderstanding'
				},
				{
					text: 'Personal Reasons',
					value: 'personal-reasons'
				}
			]);
		});
	});
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import HiddenRadioQuestion, { type HiddenRadioQuestionProps } from './question.ts';
import { JourneyResponse, type Journey } from '@planning-inspectorate/dynamic-forms';

let mockJourney: Journey;
let question: HiddenRadioQuestion;

const questionParams = {
	title: 'Hidden Radio Check',
	question: 'What is the case type?',
	fieldName: 'hidden_radio_field',
	options: [
		{
			text: 'Active Option',
			value: 'active'
		}
	],
	hiddenOptions: [
		{
			text: 'Hidden Option',
			value: 'hidden'
		},
		{
			text: 'Hidden Conditional',
			value: 'hidden_cond',
			conditional: {
				label: 'Reason:'
			}
		}
	]
};

describe('Hidden Radio Question', () => {
	beforeEach(() => {
		mockJourney = {
			response: {
				answers: {}
			} as unknown as JourneyResponse
		} as unknown as Journey;

		question = new HiddenRadioQuestion(questionParams as unknown as HiddenRadioQuestionProps);

		question.getAction = () => ({ href: '#', text: 'Change' });
	});

	describe('getOptionByValue', () => {
		it('should find an option from the standard options array', () => {
			const result = question.getOptionByValue('active');
			assert.strictEqual(result?.text, 'Active Option');
		});

		it('should find an option from the hidden options array', () => {
			const result = question.getOptionByValue('hidden');
			assert.strictEqual(result?.text, 'Hidden Option');
		});

		it('should return undefined if the value does not exist in either array', () => {
			const result = question.getOptionByValue('does-not-exist');
			assert.strictEqual(result, undefined);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should return the Option Text for an ACTIVE option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'active');

			assert.strictEqual(result[0].value, 'Active Option');
			assert.strictEqual(result[0].key, 'Hidden Radio Check');
		});

		it('should return the Option Text for a HIDDEN option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'hidden');

			assert.strictEqual(result[0].value, 'Hidden Option');
		});

		it('should format conditional answers for a HIDDEN option correctly', () => {
			const answerObj = {
				value: 'hidden_cond',
				conditional: 'It is too old'
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, answerObj);

			const expectedText = ['Hidden Conditional', 'Reason: It is too old'].join('<br>');
			assert.strictEqual(result[0].value, expectedText);
		});

		it('should show blank if no value found', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'unknown_value');

			assert.strictEqual(result[0].value, '');
		});
	});
});

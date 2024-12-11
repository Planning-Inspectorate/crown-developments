import { describe, it } from 'node:test';
import assert from 'node:assert';
import { questionHasAnswer, questionsHaveAnswers } from './question-has-answer.js';

const aTestQuestionExpectedResult = 'yes';
const aTestQuestionUnexpectedResult = 'no';
const anotherTestQuestionExpectedResult = '0';
const anotherTestQuestionUnexpectedResult = '1';
const testResponse = {
	answers: {
		aTestQuestion: aTestQuestionExpectedResult,
		anotherTestQuestion: anotherTestQuestionExpectedResult
	}
};
const testQuestions = {
	aTestQuestion: { fieldName: 'aTestQuestion' },
	anotherTestQuestion: { fieldName: 'anotherTestQuestion' },
	optionQuestion: { fieldName: 'optionQuestion', optionJoinString: ',' }
};

describe('question-has-answer', () => {
	describe('questionHasAnswer', () => {
		it('should return true when parameters do match', () => {
			const result = questionHasAnswer(testResponse, testQuestions.aTestQuestion, aTestQuestionExpectedResult);

			assert.strictEqual(result, true);
		});

		it('should return false when parameters do not match', () => {
			const result = questionHasAnswer(testResponse, testQuestions.aTestQuestion, aTestQuestionUnexpectedResult);

			assert.strictEqual(result, false);
		});

		it('should return false for options question without answer', () => {
			const result = questionHasAnswer(testResponse, testQuestions.optionQuestion, 'option-a');
			assert.strictEqual(result, false);
		});

		it('should return false for options question with null answer', () => {
			const result = questionHasAnswer(
				{
					answers: {
						optionQuestion: null
					}
				},
				testQuestions.optionQuestion,
				'option-a'
			);
			assert.strictEqual(result, false);
		});

		it('should return true for options question with string', () => {
			const result = questionHasAnswer(
				{
					answers: {
						optionQuestion: 'option-a'
					}
				},
				testQuestions.optionQuestion,
				'option-a'
			);
			assert.strictEqual(result, true);
		});

		it('should return true for options question with joined string', () => {
			const result = questionHasAnswer(
				{
					answers: {
						optionQuestion: `option-a${testQuestions.optionQuestion.optionJoinString}option-b`
					}
				},
				testQuestions.optionQuestion,
				'option-a'
			);
			assert.strictEqual(result, true);
		});

		it('should return false for options missing from string', () => {
			const result = questionHasAnswer(
				{
					answers: {
						optionQuestion: `option-a${testQuestions.optionQuestion.optionJoinString}option-b`
					}
				},
				testQuestions.optionQuestion,
				'option-c'
			);
			assert.strictEqual(result, false);
		});

		it('should return true for options question with array', () => {
			const result = questionHasAnswer(
				{
					answers: {
						optionQuestion: ['option-a', 'option-b']
					}
				},
				testQuestions.optionQuestion,
				'option-a'
			);
			assert.strictEqual(result, true);
		});

		it('should return false for options missing from array', () => {
			const result = questionHasAnswer(
				{
					answers: {
						optionQuestion: ['option-a', 'option-b']
					}
				},
				testQuestions.optionQuestion,
				'option-c'
			);
			assert.strictEqual(result, false);
		});
	});

	describe('questionsHaveAnswer', () => {
		const tests = [
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionExpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionExpectedResult]
				],
				'and',
				true
			],
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionExpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionUnexpectedResult]
				],
				'and',
				false
			],
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionUnexpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionUnexpectedResult]
				],
				'and',
				false
			],
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionUnexpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionExpectedResult]
				],
				'and',
				false
			],

			[
				[
					[testQuestions.aTestQuestion, aTestQuestionExpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionExpectedResult]
				],
				'or',
				true
			],
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionExpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionUnexpectedResult]
				],
				'or',
				true
			],
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionUnexpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionExpectedResult]
				],
				'or',
				true
			],
			[
				[
					[testQuestions.aTestQuestion, aTestQuestionUnexpectedResult],
					[testQuestions.anotherTestQuestion, anotherTestQuestionUnexpectedResult]
				],
				'or',
				false
			]
		];

		for (const [questionKeyTuples, logicalCombinator, expectedResult] of tests) {
			it('should return expectedResult given parameter set and logical combinator', () => {
				const result = questionsHaveAnswers(testResponse, questionKeyTuples, { logicalCombinator });
				assert.strictEqual(result, expectedResult);
			});
		}
	});
});

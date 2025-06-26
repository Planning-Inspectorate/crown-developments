import { describe, it } from 'node:test';
import assert from 'node:assert';
import { attachmentsContainsRedactedItems, questionHasAnswer, questionsHaveAnswers } from './question-has-answer.js';

const aTestQuestionExpectedResult = 'yes';
const aTestQuestionUnexpectedResult = 'no';
const anotherTestQuestionExpectedResult = '0';
const anotherTestQuestionUnexpectedResult = '1';
const testResponse = {
	answers: {
		aTestQuestion: aTestQuestionExpectedResult,
		anotherTestQuestion: anotherTestQuestionExpectedResult,
		aThirdTestQuestion: true
	}
};
const testQuestions = {
	aTestQuestion: { fieldName: 'aTestQuestion' },
	anotherTestQuestion: { fieldName: 'anotherTestQuestion' },
	aThirdTestQuestion: { fieldName: 'aThirdTestQuestion', optionJoinString: ',' },
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

		it('should only split string answers', () => {
			const result = questionHasAnswer(testResponse, testQuestions.aThirdTestQuestion, true);
			assert.strictEqual(result, true);
		});
	});

	describe('attachmentsContainsRedactedItems', () => {
		it('should return false if response.answer is falsy', () => {
			const testCases = [{ answers: null }, { answers: undefined }, { answers: '' }];
			for (const testCase of testCases) {
				assert.strictEqual(attachmentsContainsRedactedItems(testCase, {}), false);
			}
		});
		it('should return false if answerField is not an array', () => {
			const response = {
				answers: {
					myselfAttachments: 'test'
				}
			};

			assert.strictEqual(attachmentsContainsRedactedItems(response, { fieldName: 'myselfAttachments' }), false);
		});
		it('should return false if answerField is an array but length is not greater than 0', () => {
			const response = {
				answers: {
					myselfAttachments: []
				}
			};
			assert.strictEqual(attachmentsContainsRedactedItems(response, { fieldName: 'myselfAttachments' }), false);
		});
		it('should return false if answerField is an array but does not contain both redacted fields', () => {
			const response = {
				answers: {
					myselfAttachments: [
						{ itemId: 'file-1', fileName: 'file1.pdf', size: 12345, redactedFileName: 'redacted-file1.pdf' },
						{ itemId: 'file-2', fileName: 'file2.pdf', size: 67890, redactedItemId: 'redacted-file-2' }
					]
				}
			};
			assert.strictEqual(attachmentsContainsRedactedItems(response, { fieldName: 'myselfAttachments' }), false);
		});
		it('should return true if answerField is an array and contains redacted fields', () => {
			const response = {
				answers: {
					submitterAttachments: [
						{
							itemId: 'file-1',
							fileName: 'file1.pdf',
							size: 12345,
							redactedItemId: 'redacted-file-1',
							redactedFileName: 'redacted-file1.pdf'
						},
						{
							itemId: 'file-2',
							fileName: 'file2.pdf',
							size: 67890,
							redactedItemId: 'redacted-file-2',
							redactedFileName: 'redacted-file2.pdf'
						}
					]
				}
			};
			assert.strictEqual(attachmentsContainsRedactedItems(response, { fieldName: 'submitterAttachments' }), true);
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

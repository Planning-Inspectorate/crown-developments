import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import CrossQuestionValidator from './cross-question-validator.js';

function createMockRequest(answers) {
	return {
		res: {
			locals: {
				journeyResponse: {
					answers: answers || {}
				}
			}
		}
	};
}

describe('CrossQuestionValidator', () => {
	test('throws error if otherFieldName is missing', () => {
		assert.throws(() => {
			new CrossQuestionValidator({ validationFunction: () => true });
		}, /requires otherFieldName/);
	});

	test('throws error if validationFunction is missing', () => {
		assert.throws(() => {
			new CrossQuestionValidator({ otherFieldName: 'other' });
		}, /requires a validationFunction/);
	});

	test('throws error if validationFunction is not a function', () => {
		assert.throws(() => {
			new CrossQuestionValidator({ otherFieldName: 'other', validationFunction: 123 });
		}, /requires a validationFunction/);
	});

	test('returns a validation chain that calls the validation function with correct answers', async () => {
		let calledWith;
		const validator = new CrossQuestionValidator({
			otherFieldName: 'other',
			validationFunction: (questionAnswer, otherQuestionAnswer) => {
				calledWith = { questionAnswer, otherQuestionAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = createMockRequest({ field: 'foo', other: 'bar' });
		await chain[0].run(req);
		assert.deepEqual(calledWith, { questionAnswer: 'foo', otherQuestionAnswer: 'bar' });
	});

	test('validation fails if validation function returns false', async () => {
		const validator = new CrossQuestionValidator({
			otherFieldName: 'other',
			validationFunction: () => false
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = createMockRequest({ field: 'foo', other: 'bar' });
		req.body = { field: 'foo' };
		const result = await chain[0].run(req);
		assert.strictEqual(result.isEmpty(), false);
		assert.match(result.array()[0].msg, /Cross-question validation failed/);
	});

	test('validation function called when journeyResponse is missing', async () => {
		let calledWith;
		const validator = new CrossQuestionValidator({
			otherFieldName: 'other',
			validationFunction: (questionAnswer, otherQuestionAnswer) => {
				calledWith = { questionAnswer, otherQuestionAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = { res: { locals: {} } };
		await chain[0].run(req);
		assert.deepEqual(calledWith, { questionAnswer: undefined, otherQuestionAnswer: undefined });
	});
});

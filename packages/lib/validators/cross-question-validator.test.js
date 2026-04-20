import { describe, test, it } from 'node:test';
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
	test('throws error if dependencyFieldName is missing', () => {
		assert.throws(() => {
			new CrossQuestionValidator({ validationFunction: () => true });
		}, /requires dependencyFieldName/);
	});

	test('throws error if validationFunction is missing', () => {
		assert.throws(() => {
			new CrossQuestionValidator({ dependencyFieldName: 'other' });
		}, /requires a validationFunction/);
	});

	test('throws error if validationFunction is not a function', () => {
		assert.throws(() => {
			new CrossQuestionValidator({ dependencyFieldName: 'other', validationFunction: 123 });
		}, /requires a validationFunction/);
	});

	test('returns a validation chain that calls the validation function with correct answers', async () => {
		let calledWith;
		const validator = new CrossQuestionValidator({
			dependencyFieldName: 'other',
			validationFunction: (currentAnswer, dependencyAnswer) => {
				calledWith = { currentAnswer, dependencyAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = createMockRequest({ field: 'foo', other: 'bar' });
		await chain[0].run(req);
		assert.deepEqual(calledWith, { currentAnswer: 'foo', dependencyAnswer: 'bar' });
	});

	test('validation fails if validation function returns false', async () => {
		const validator = new CrossQuestionValidator({
			dependencyFieldName: 'other',
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
			dependencyFieldName: 'other',
			validationFunction: (currentAnswer, dependencyAnswer) => {
				calledWith = { currentAnswer, dependencyAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = { res: { locals: {} } };
		await chain[0].run(req);
		assert.deepEqual(calledWith, { currentAnswer: undefined, dependencyAnswer: undefined });
	});

	it('should use session answers instead of request body values when useBodyValues is false', async () => {
		let calledWith;
		const validator = new CrossQuestionValidator({
			dependencyFieldName: 'other',
			validationFunction: (currentAnswer, dependencyAnswer) => {
				calledWith = { currentAnswer, dependencyAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = createMockRequest({ field: 'from-session', other: 'from-session-dependency' });
		req.body = { field: 'from-body', other: 'from-body-dependency' };
		await chain[0].run(req);
		assert.deepEqual(calledWith, {
			currentAnswer: 'from-session',
			dependencyAnswer: 'from-session-dependency'
		});
	});

	it('should use request body values when useBodyValues is true', async () => {
		let calledWith;
		const validator = new CrossQuestionValidator({
			dependencyFieldName: 'other',
			useBodyValues: true,
			validationFunction: (currentAnswer, dependencyAnswer) => {
				calledWith = { currentAnswer, dependencyAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = createMockRequest({ field: 'from-session', other: 'from-session-dependency' });
		req.body = { field: 'from-body', other: 'from-body-dependency' };
		await chain[0].run(req);
		assert.deepEqual(calledWith, {
			currentAnswer: 'from-body',
			dependencyAnswer: 'from-body-dependency'
		});
	});

	it('should fail validation with thrown error message when validation function throws', async () => {
		const validator = new CrossQuestionValidator({
			dependencyFieldName: 'other',
			validationFunction: () => {
				throw new Error('boom');
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = createMockRequest({ field: 'foo', other: 'bar' });
		const result = await chain[0].run(req);
		assert.strictEqual(result.isEmpty(), false);
		assert.strictEqual(result.array()[0].msg, 'boom');
	});

	it('should call validation function with undefined values when journeyResponse has no answers object', async () => {
		let calledWith;
		const validator = new CrossQuestionValidator({
			dependencyFieldName: 'other',
			validationFunction: (currentAnswer, dependencyAnswer) => {
				calledWith = { currentAnswer, dependencyAnswer };
				return true;
			}
		});
		const questionObj = { fieldName: 'field' };
		const chain = validator.validate(questionObj);
		const req = { res: { locals: { journeyResponse: {} } } };
		await chain[0].run(req);
		assert.deepEqual(calledWith, { currentAnswer: undefined, dependencyAnswer: undefined });
	});
});

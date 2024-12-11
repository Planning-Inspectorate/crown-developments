import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getConditionalAnswer, getConditionalFieldName } from './question-utils.js';

describe('getConditionalFieldName', () => {
	it('returns conditional field name given parent and child name', () => {
		assert.strictEqual(getConditionalFieldName('parent', 'child'), 'parent_child');
	});
});

describe('getConditionalAnswer', () => {
	const setup = () => {
		const answers = {
			field: 'yes',
			otherField: 'yes',
			field_conditional: 'test'
		};
		const question = {
			fieldName: 'field',
			options: [
				{
					value: 'yes',
					conditional: {
						fieldName: 'conditional'
					}
				},
				{
					value: 'no'
				}
			]
		};
		return { answers, question };
	};

	it('returns conditional field value when it exists', () => {
		const { answers, question } = setup();
		const expectedResult = 'test';
		assert.strictEqual(getConditionalAnswer(answers, question, 'yes'), expectedResult);
	});

	it('returns null when option chosen does not have conditional value', () => {
		const { answers, question } = setup();
		answers.field = 'no';
		assert.strictEqual(getConditionalAnswer(answers, question, 'no'), null);
	});

	it('returns null when question does not have conditional value', () => {
		const { answers, question } = setup();
		delete question.options[0].conditional;
		assert.strictEqual(getConditionalAnswer(answers, question, 'yes'), null);
	});
});

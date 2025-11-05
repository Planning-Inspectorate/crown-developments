import { describe, it } from 'node:test';
import assert from 'node:assert';
import CILAmountQuestion from '../cil-amount/question.js';

describe('CILAmountQuestion (Configuration Check)', () => {
	const questionProps = {
		title: 'CIL Amount',
		question: 'Is CIL payable?',
		fieldName: 'isCilPayable',
		url: 'cil-amount',
		cilAmountInputFieldName: 'cilLiability',
		cilAmountQuestion: 'CIL liability amount',
		validators: []
	};

	const question = new CILAmountQuestion(questionProps);

	it('should retain the specific cilAmountInputFieldName property', () => {
		assert.strictEqual(question.conditionalAmountFieldName, 'cilLiability');
	});

	it('should correctly configure the conditional options', () => {
		assert.strictEqual(question.options[0].text, 'Yes');
		assert.strictEqual(question.options[1].text, 'No');

		const conditional = question.options[0].conditional;

		assert.strictEqual(conditional.question, 'CIL liability amount');

		assert.strictEqual(conditional.prefix.text, '£');
		assert.strictEqual(conditional.fieldName, 'amount');
	});
});

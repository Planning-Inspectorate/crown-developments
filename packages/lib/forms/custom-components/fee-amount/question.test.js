import { describe, it } from 'node:test';
import assert from 'node:assert';
import FeeAmountQuestion from '../fee-amount/question.js';

describe('FeeAmountQuestion (Configuration Check)', () => {
	const questionProps = {
		title: 'Fee Amount',
		question: 'What is the application fee?',
		fieldName: 'hasApplicationFee',
		url: 'fee-amount',
		feeAmountInputFieldName: 'applicationFee',
		feeAmountQuestion: 'For example, £1000.00',
		validators: []
	};

	const question = new FeeAmountQuestion(questionProps);

	it('should retain the specific feeAmountInputFieldName property', () => {
		assert.strictEqual(question.conditionalAmountFieldName, 'applicationFee');
	});

	it('should correctly configure the conditional options', () => {
		assert.strictEqual(question.options[0].text, 'Yes');
		assert.strictEqual(question.options[1].text, 'No');

		const conditional = question.options[0].conditional;

		assert.strictEqual(conditional.question, 'For example, £1000.00');

		assert.strictEqual(conditional.prefix.text, '£');
		assert.strictEqual(conditional.fieldName, 'amount');
	});
});

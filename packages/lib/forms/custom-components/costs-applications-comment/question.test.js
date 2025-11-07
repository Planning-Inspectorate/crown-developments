import { describe, it } from 'node:test';
import assert from 'node:assert';
import CostsApplicationsCommentQuestion from './question.js';

describe('CostsApplicationsCommentQuestion (Configuration Check)', () => {
	const questionProps = {
		title: 'Costs Applications',
		question: 'Are there Costs Applications?',
		fieldName: 'hasCostsApplications',
		url: 'costs-applications',
		costsApplicationInputFieldName: 'costsApplications',
		costsApplicationQuestion: 'Costs applications text',
		validators: []
	};

	const question = new CostsApplicationsCommentQuestion(questionProps);

	it('should retain the specific costsApplicationInputFieldName property', () => {
		assert.strictEqual(question.conditionalTextFieldName, 'costsApplications');
	});

	it('should correctly configure the conditional options', () => {
		assert.strictEqual(question.options[0].text, 'Yes');
		assert.strictEqual(question.options[1].text, 'No');

		const conditional = question.options[0].conditional;

		assert.strictEqual(conditional.question, 'Costs applications text');

		assert.strictEqual(conditional.fieldName, 'text');
	});
});

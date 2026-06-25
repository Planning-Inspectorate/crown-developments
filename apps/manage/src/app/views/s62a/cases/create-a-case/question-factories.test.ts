import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLpaContactQuestion } from './question-factories.ts';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';

describe('createLpaContactQuestion factory', () => {
	it('should generate correct configuration for the primary LPA (isSecondary = false)', () => {
		const question = createLpaContactQuestion(false);

		assert.strictEqual(question.type, COMPONENT_TYPES.MULTI_FIELD_INPUT);
		assert.strictEqual(question.title, 'LPA');
		assert.strictEqual(question.question, "What are the LPA's contact details?");
		assert.strictEqual(question.fieldName, 'lpaContactDetails');
		assert.strictEqual(question.url, 'lpa-contact-details');

		assert.strictEqual(question.inputFields.length, 4);
		assert.strictEqual(question.inputFields[0].fieldName, 'lpaFirstName');
		assert.strictEqual(question.inputFields[1].fieldName, 'lpaLastName');
		assert.strictEqual(question.inputFields[2].fieldName, 'lpaEmailAddress');
		assert.strictEqual(question.inputFields[3].fieldName, 'lpaPhoneNumber');

		assert.strictEqual(question.validators.length, 1);
		assert.ok(question.validators[0] instanceof MultiFieldInputValidator, 'Should use the MultiFieldInputValidator');

		const validator = question.validators[0] as unknown as MultiFieldInputValidator;
		assert.strictEqual(validator.fields[0].fieldName, 'lpaFirstName');
	});

	it('should generate correct configuration for the secondary LPA (isSecondary = true)', () => {
		const question = createLpaContactQuestion(true);

		assert.strictEqual(question.type, COMPONENT_TYPES.MULTI_FIELD_INPUT);
		assert.strictEqual(question.title, 'Secondary LPA name');
		assert.strictEqual(question.question, "What are the secondary LPA's contact details?");
		assert.strictEqual(question.fieldName, 'secondaryLpaContactDetails');
		assert.strictEqual(question.url, 'secondary-lpa-contact-details');

		assert.strictEqual(question.inputFields.length, 4);
		assert.strictEqual(question.inputFields[0].fieldName, 'secondaryLpaFirstName');
		assert.strictEqual(question.inputFields[1].fieldName, 'secondaryLpaLastName');
		assert.strictEqual(question.inputFields[2].fieldName, 'secondaryLpaEmailAddress');
		assert.strictEqual(question.inputFields[3].fieldName, 'secondaryLpaPhoneNumber');

		assert.strictEqual(question.validators.length, 1);
		assert.ok(question.validators[0] instanceof MultiFieldInputValidator, 'Should use the MultiFieldInputValidator');

		const validator = question.validators[0] as unknown as MultiFieldInputValidator;
		assert.strictEqual(validator.fields[0].fieldName, 'secondaryLpaFirstName');
	});
});

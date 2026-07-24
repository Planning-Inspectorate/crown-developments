import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLpaContactQuestion, multiContactQuestions } from './question-factories.ts';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import { CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import { HIDDEN_TYPE } from '@pins/crowndev-lib/forms/custom-components/custom-multi-field-input/question.js';

describe('createLpaContactQuestion factory', () => {
	it('should generate correct configuration for the primary LPA (isSecondary = false)', () => {
		const question = createLpaContactQuestion(false);

		assert.strictEqual(question.type, COMPONENT_TYPES.MULTI_FIELD_INPUT);
		assert.strictEqual(question.title, 'LPA contact');
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
		assert.strictEqual(question.title, 'Secondary LPA contact');
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

describe('multiContactQuestions factory', () => {
	it('should generate correct configuration for an agent contact', () => {
		const questions = multiContactQuestions({ prefix: 'agent', title: 'agent', organisationOptions: null });
		const question = questions.agentContactDetails;

		assert.ok(question, 'Should create a key based on the prefix');
		assert.strictEqual(question.type, CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT);
		assert.strictEqual(question.title, 'Agent contact');
		assert.strictEqual(question.question, "What are the agent's contact details?");
		assert.strictEqual(question.fieldName, 'agentContactDetails');
		assert.strictEqual(question.url, 'agent-contact');

		assert.strictEqual(question.inputFields.length, 4);
		assert.strictEqual(question.inputFields[0].fieldName, 'agentFirstName');
		assert.strictEqual(question.inputFields[1].fieldName, 'agentLastName');
		assert.strictEqual(question.inputFields[2].fieldName, 'agentContactEmail');
		assert.strictEqual(question.inputFields[3].fieldName, 'agentContactTelephoneNumber');

		assert.strictEqual(question.validators.length, 1);
		assert.ok(question.validators[0] instanceof MultiFieldInputValidator, 'Should use the MultiFieldInputValidator');

		const validator = question.validators[0] as unknown as MultiFieldInputValidator;
		assert.strictEqual(validator.fields.length, 4);
		assert.strictEqual(validator.fields[0].fieldName, 'agentFirstName');
	});

	it('should correctly handle multi-word titles and camelCase prefixes', () => {
		const questions = multiContactQuestions({ prefix: 'siteOwner', title: 'site owner', organisationOptions: null });
		const question = questions.siteOwnerContactDetails;

		assert.ok(question, 'Should create a key based on the prefix');
		assert.strictEqual(question.title, 'Site owner contact');
		assert.strictEqual(question.question, "What are the site owner's contact details?");
		assert.strictEqual(question.fieldName, 'siteOwnerContactDetails');
		assert.strictEqual(question.url, 'site-owner-contact');

		assert.strictEqual(question.inputFields.length, 4);
		assert.strictEqual(question.inputFields[0].fieldName, 'siteOwnerFirstName');

		const validator = question.validators[0] as unknown as MultiFieldInputValidator;
		assert.strictEqual(validator.fields.length, 4);
		assert.strictEqual(validator.fields[0].fieldName, 'siteOwnerFirstName');
	});

	it('should add a hidden field and no extra validator when a single organisation option is provided', () => {
		const organisationOptions = [{ text: 'Acme Corp', value: 'org-1' }];
		const questions = multiContactQuestions({ prefix: 'applicant', title: 'applicant', organisationOptions });
		const question = questions.applicantContactDetails;

		assert.strictEqual(question.inputFields.length, 5);
		assert.strictEqual(question.inputFields[4].type, HIDDEN_TYPE);
		assert.strictEqual(question.inputFields[4].fieldName, 'applicantContactOrganisation');
		assert.strictEqual(question.inputFields[4].value, 'org-1');

		const validator = question.validators[0] as unknown as MultiFieldInputValidator;
		assert.strictEqual(validator.fields.length, 4);
	});

	it('should add a radio field and an extra validator when multiple organisation options are provided', () => {
		const organisationOptions = [
			{ text: 'Acme Corp', value: 'org-1' },
			{ text: 'Stark Industries', value: 'org-2' }
		];
		const questions = multiContactQuestions({ prefix: 'applicant', title: 'applicant', organisationOptions });
		const question = questions.applicantContactDetails;

		assert.strictEqual(question.inputFields.length, 5);
		assert.strictEqual(question.inputFields[4].type, COMPONENT_TYPES.RADIO);
		assert.strictEqual(question.inputFields[4].fieldName, 'applicantContactOrganisation');
		assert.deepStrictEqual(question.inputFields[4].options, organisationOptions);
		assert.strictEqual(question.inputFields[4].legend, 'Which organisation is this contact for?');

		const validator = question.validators[0] as unknown as MultiFieldInputValidator;
		assert.strictEqual(validator.fields.length, 5);
		assert.strictEqual(validator.fields[4].fieldName, 'applicantContactOrganisation');
		assert.strictEqual(validator.fields[4].validators?.length, 1);
	});
});

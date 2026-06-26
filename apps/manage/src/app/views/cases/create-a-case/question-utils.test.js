import { describe, it } from 'node:test';
import assert from 'node:assert';
import { multiContactQuestions } from './question-utils.js';

describe('question-utils', () => {
	describe('multiContactQuestions', () => {
		it('creates a single contact details question keyed by prefix', () => {
			const questions = multiContactQuestions({
				prefix: 'applicant',
				title: 'applicant',
				organisationOptions: [{ text: 'Org One', value: 'org-1' }]
			});

			assert.deepStrictEqual(Object.keys(questions), ['applicantContactDetails']);

			const question = questions.applicantContactDetails;
			assert.ok(question);
			assert.strictEqual(question.fieldName, 'applicantContactDetails');
			assert.strictEqual(question.url, 'applicant-contact');
			assert.strictEqual(question.question, 'Add applicant contact details');
			assert.strictEqual(question.title, 'Applicant contact');
		});

		it('uses a hidden organisation field when there is exactly one organisation option', () => {
			const questions = multiContactQuestions({
				prefix: 'applicant',
				title: 'applicant',
				organisationOptions: [{ text: 'Org One', value: 'org-1' }]
			});

			const question = questions.applicantContactDetails;
			const organisationField = question.inputFields.find(
				(inputField) => inputField.fieldName === 'applicantContactOrganisation'
			);

			assert.ok(organisationField);
			assert.strictEqual(organisationField.type, 'hidden');
			assert.strictEqual(organisationField.value, 'org-1');
		});

		it('uses a radio organisation field when there are multiple organisation options', () => {
			const organisationOptions = [
				{ text: 'Org One', value: 'org-1' },
				{ text: 'Org Two', value: 'org-2' }
			];

			const questions = multiContactQuestions({
				prefix: 'applicant',
				title: 'applicant',
				organisationOptions: organisationOptions
			});

			const question = questions.applicantContactDetails;
			const organisationField = question.inputFields.find(
				(inputField) => inputField.fieldName === 'applicantContactOrganisation'
			);

			assert.ok(organisationField);
			assert.strictEqual(organisationField.type, 'radio');
			assert.deepStrictEqual(organisationField.options, organisationOptions);
			assert.strictEqual(organisationField.formatTextFunction('org-2'), 'Org Two');
			assert.strictEqual(organisationField.formatTextFunction('unknown-org'), 'unknown-org');
		});

		it('does not include an organisation required validator when there is exactly one organisation option', () => {
			const questions = multiContactQuestions({
				prefix: 'applicant',
				title: 'applicant',
				organisationOptions: [{ text: 'Org One', value: 'org-1' }]
			});

			const question = questions.applicantContactDetails;
			const [multiFieldValidator] = question.validators;

			const organisationFieldRule = multiFieldValidator.fields.find(
				(fieldRule) => fieldRule.fieldName === 'applicantContactOrganisation'
			);

			assert.strictEqual(organisationFieldRule, undefined);
		});

		it('includes an organisation required validator when there are multiple organisation options', () => {
			const questions = multiContactQuestions({
				prefix: 'applicant',
				title: 'applicant',
				organisationOptions: [
					{ text: 'Org One', value: 'org-1' },
					{ text: 'Org Two', value: 'org-2' }
				]
			});

			const question = questions.applicantContactDetails;
			const [multiFieldValidator] = question.validators;

			const organisationFieldRule = multiFieldValidator.fields.find(
				(fieldRule) => fieldRule.fieldName === 'applicantContactOrganisation'
			);

			assert.ok(organisationFieldRule);
			assert.ok(Array.isArray(organisationFieldRule.validators));
			assert.ok(organisationFieldRule.validators.length > 0);
		});

		it('uses url-cased prefix in the question url', () => {
			const questions = multiContactQuestions({
				prefix: 'myFieldName',
				title: 'applicant',
				organisationOptions: [{ text: 'Org One', value: 'org-1' }]
			});

			assert.strictEqual(questions.myFieldNameContactDetails.url, 'my-field-name-contact');
		});

		it('creates input fields with names derived from the prefix', () => {
			const questions = multiContactQuestions({
				prefix: 'applicant',
				title: 'applicant',
				organisationOptions: [{ text: 'Org One', value: 'org-1' }]
			});

			const question = questions.applicantContactDetails;
			const inputFieldNames = question.inputFields.map((inputField) => inputField.fieldName);

			assert.ok(inputFieldNames.includes('applicantFirstName'));
			assert.ok(inputFieldNames.includes('applicantLastName'));
			assert.ok(inputFieldNames.includes('applicantContactEmail'));
			assert.ok(inputFieldNames.includes('applicantContactTelephoneNumber'));
			assert.ok(inputFieldNames.includes('applicantContactOrganisation'));
		});

		it('should not include an organisation input field when options is null', () => {
			const questions = multiContactQuestions({
				prefix: 'agent',
				title: 'agent',
				organisationOptions: null
			});

			const question = questions.agentContactDetails;
			const inputFieldNames = question.inputFields.map((inputField) => inputField.fieldName);

			assert.ok(!inputFieldNames.includes('agentContactOrganisation'));
		});

		it('should not include an organisation required validator when options is null', () => {
			const questions = multiContactQuestions({
				prefix: 'agent',
				title: 'agent',
				organisationOptions: null
			});

			const question = questions.agentContactDetails;
			const [multiFieldValidator] = question.validators;

			const organisationFieldRule = multiFieldValidator.fields.find(
				(fieldRule) => fieldRule.fieldName === 'agentContactOrganisation'
			);

			assert.strictEqual(organisationFieldRule, undefined);
		});

		describe('name field validation', () => {
			const questions = multiContactQuestions({
				prefix: 'agent',
				title: 'agent',
				organisationOptions: null
			});

			const question = questions.agentContactDetails;
			const [multiFieldValidator] = question.validators;

			it('should validate first name with regex allowing only letters, spaces, hyphens and apostrophes', () => {
				const firstNameFieldRule = multiFieldValidator.fields.find(
					(fieldRule) => fieldRule.fieldName === 'agentFirstName'
				);

				assert.ok(firstNameFieldRule);
				assert.ok(Array.isArray(firstNameFieldRule.validators));

				const stringValidator = firstNameFieldRule.validators.find(
					(validator) => validator.constructor.name === 'StringValidator'
				);

				assert.ok(stringValidator);
				assert.ok(stringValidator.regex);
				assert.strictEqual(
					stringValidator.regex.regexMessage,
					'First name must only include letters, spaces, hyphens and apostrophes'
				);

				const regex = new RegExp(stringValidator.regex.regex);

				assert.ok(regex.test('Jane'));
				assert.ok(regex.test('Mary Jane'));
				assert.ok(regex.test("O'Brien"));
				assert.ok(regex.test('Anne-Marie'));
				assert.ok(regex.test("Mary-Jane O'Connor"));

				assert.ok(!regex.test('Jane2'));
				assert.ok(!regex.test('Jane!'));
				assert.ok(!regex.test('Mary@Jane'));
				assert.ok(!regex.test('Mary.Jane'));
				assert.ok(!regex.test(''));
			});

			it('should validate last name with regex allowing only letters, spaces, hyphens and apostrophes', () => {
				const lastNameFieldRule = multiFieldValidator.fields.find(
					(fieldRule) => fieldRule.fieldName === 'agentLastName'
				);

				assert.ok(lastNameFieldRule);
				assert.ok(Array.isArray(lastNameFieldRule.validators));

				const stringValidator = lastNameFieldRule.validators.find(
					(validator) => validator.constructor.name === 'StringValidator'
				);

				assert.ok(stringValidator);
				assert.ok(stringValidator.regex);
				assert.strictEqual(
					stringValidator.regex.regexMessage,
					'Last name must only include letters, spaces, hyphens and apostrophes'
				);

				const regex = new RegExp(stringValidator.regex.regex);

				assert.ok(regex.test('Smith'));
				assert.ok(regex.test('Van Der Berg'));
				assert.ok(regex.test("O'Neill"));
				assert.ok(regex.test('Smith-Jones'));
				assert.ok(regex.test("D'Angelo-Smith"));

				assert.ok(!regex.test('Smith2'));
				assert.ok(!regex.test('Smith!'));
				assert.ok(!regex.test('Jones@Company'));
				assert.ok(!regex.test('Smith_Jones'));
				assert.ok(!regex.test(''));
			});
		});
	});
});

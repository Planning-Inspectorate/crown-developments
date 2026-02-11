import { describe, it } from 'node:test';
import assert from 'node:assert';
import { contactQuestions, multiContactQuestions } from './question-utils.js';

describe('question-utils', () => {
	describe('contactQuestions', () => {
		const prefix = 'myField';
		const prefixHyphens = 'my-field';
		const title = 'My Field';
		it('should create four questions with prefix in question keys', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });

			assert.strictEqual(Object.keys(questions).length, 4);
			for (const key of Object.keys(questions)) {
				assert.ok(key.startsWith(prefix));
			}
		});
		it('should use title for question and title fields', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });
			for (const question of Object.values(questions)) {
				assert.ok(question.title.startsWith(title));
				assert.ok(question.question.includes(title.toLowerCase()));
			}
		});
		it('should use hyphenated prefix for urls', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });
			for (const question of Object.values(questions)) {
				assert.ok(question.url.startsWith(prefixHyphens));
			}
		});
	});
});

describe('multiContactQuestions', () => {
	it('creates a single contact details question keyed by prefix', () => {
		const questions = multiContactQuestions({
			prefix: 'applicant',
			title: 'applicant',
			options: [{ text: 'Org One', value: 'org-1' }]
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
			options: [{ text: 'Org One', value: 'org-1' }]
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
			options: organisationOptions
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
			options: [{ text: 'Org One', value: 'org-1' }]
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
			options: [
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
			options: [{ text: 'Org One', value: 'org-1' }]
		});

		assert.strictEqual(questions.myFieldNameContactDetails.url, 'my-field-name-contact');
	});

	it('creates input fields with names derived from the prefix', () => {
		const questions = multiContactQuestions({
			prefix: 'applicant',
			title: 'applicant',
			options: [{ text: 'Org One', value: 'org-1' }]
		});

		const question = questions.applicantContactDetails;
		const inputFieldNames = question.inputFields.map((inputField) => inputField.fieldName);

		assert.ok(inputFieldNames.includes('applicantFirstName'));
		assert.ok(inputFieldNames.includes('applicantLastName'));
		assert.ok(inputFieldNames.includes('applicantContactEmail'));
		assert.ok(inputFieldNames.includes('applicantContactTelephoneNumber'));
		assert.ok(inputFieldNames.includes('applicantContactOrganisation'));
	});
});

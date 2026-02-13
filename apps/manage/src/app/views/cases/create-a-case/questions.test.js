// apps/manage/src/app/views/cases/create-a-case/questions.test.js
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { getQuestions } from './questions.js';

describe('create-a-case questions', () => {
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	it('populates applicant organisation options when journey response contains manageApplicantDetails', () => {
		const journeyResponse = {
			answers: {
				hasAgent: 'yes',
				manageApplicantDetails: [
					{ id: 'org-1', organisationName: 'Org One' },
					{ id: 'org-2', organisationName: 'Org Two' },
					{ id: 'org-3', organisationName: '' }, // Should be filtered out
					{ id: '', organisationName: 'Org No Id' }, // Should be filtered out
					{ id: 'org-4', organisationName: 'Org Four' }
				]
			}
		};

		const questions = getQuestions(journeyResponse);

		const expectedOptions = [
			{ text: 'Org One', value: 'org-1' },
			{ text: 'Org Two', value: 'org-2' },
			{ text: 'Org Four', value: 'org-4' }
		];

		const applicantContactDetailsQuestion = questions.applicantContactDetails;
		const fieldWithApplicantOptions = applicantContactDetailsQuestion.inputFields.find(
			(inputField) => inputField.fieldName === 'applicantContactOrganisation'
		);
		assert.ok(fieldWithApplicantOptions, 'Could not find a question containing the expected applicant options');

		const foundOptions = fieldWithApplicantOptions.options;
		expectedOptions.forEach((expectedOption) => {
			const matchingOption = foundOptions.find(
				(option) => option.value === expectedOption.value && option.text === expectedOption.text
			);
			assert.ok(matchingOption, `Expected option "${expectedOption.text}" was not found in the options list`);
		});

		const invalidOptionEmptyName = foundOptions.find((option) => option.value === 'org-3');
		const invalidOptionEmptyId = foundOptions.find((option) => option.text === 'Org No Id');

		assert.strictEqual(invalidOptionEmptyName, undefined, 'Should have filtered out item with empty name');
		assert.strictEqual(invalidOptionEmptyId, undefined, 'Should have filtered out item with empty ID');
	});

	it('does not require any applicant contacts when agent is present', () => {
		const journeyResponse = {
			answers: {
				hasAgent: 'yes'
			}
		};
		const questions = getQuestions(journeyResponse);
		const manageApplicantContacts = questions.manageApplicantContacts;
		assert.ok(manageApplicantContacts);
		assert.strictEqual(manageApplicantContacts.validators.length, 0);
	});

	it('requires at least one applicant contact when agent is not present', () => {
		const journeyResponse = {
			answers: {
				hasAgent: 'no'
			}
		};
		const questions = getQuestions(journeyResponse);
		const manageApplicantContacts = questions.manageApplicantContacts;
		assert.ok(manageApplicantContacts);
		assert.ok(manageApplicantContacts.validators.length > 0);

		const validator = manageApplicantContacts.validators.find(
			(validator) => validator.constructor.name === 'CustomManageListValidator'
		);
		assert.ok(validator);
		assert.strictEqual(validator.minimumAnswers, 1);
	});

	it('should validate same answer for secondary LPA', () => {
		const questions = getQuestions();
		const validator = questions.secondaryLocalPlanningAuthority.validators.find(
			(validator) => validator.constructor.name === 'SameAnswerValidator'
		);
		assert.ok(validator);
	});

	it('should validate coordinates with CoordinatesValidator', () => {
		const questions = getQuestions();
		const validator = questions.siteCoordinates.validators.find(
			(validator) => validator.constructor.name === 'CoordinatesValidator'
		);
		assert.ok(validator);
	});

	it('should validate addresses with AddressValidator', () => {
		const questions = getQuestions();
		const validator = questions.siteAddress.validators.find(
			(validator) => validator.constructor.name === 'AddressValidator'
		);
		assert.ok(validator);
	});
	it('sets manageApplicants title to "Check applicant details" when isQuestionView is true', () => {
		const journeyResponse = {
			answers: {
				hasAgent: 'yes',
				manageApplicantDetails: [{ id: 'org-1', organisationName: 'Org One' }]
			}
		};
		const questions = getQuestions(journeyResponse, true);
		assert.strictEqual(questions.manageApplicants.title, 'Check applicant details');
	});

	it('sets manageApplicants title to "Applicants" when isQuestionView is false', () => {
		const journeyResponse = {
			answers: {
				hasAgent: 'yes',
				manageApplicantDetails: [{ id: 'org-1', organisationName: 'Org One' }]
			}
		};
		const questions = getQuestions(journeyResponse, false);
		assert.strictEqual(questions.manageApplicants.title, 'Applicants');
	});
	describe('validateContactsAgainstOrganisations', () => {
		function getCrossValidator(questions) {
			return questions.manageApplicantContacts.validators.find(
				(validator) => validator.constructor.name === 'CrossQuestionValidator'
			);
		}
		it('allows validation when every applicant contact references an existing applicant organisation and every organisation has a contact', () => {
			const journeyResponse = {
				answers: {
					hasAgent: 'no',
					manageApplicantDetails: [
						{ id: 'org-1', organisationName: 'Org One' },
						{ id: 'org-2', organisationName: 'Org Two' }
					]
				}
			};

			const questions = getQuestions(journeyResponse);

			const crossValidator = getCrossValidator(questions);
			assert.ok(crossValidator);

			assert.strictEqual(
				crossValidator.validationFunction(
					[{ applicantContactOrganisation: 'org-1' }, { applicantContactOrganisation: 'org-2' }],
					journeyResponse.answers.manageApplicantDetails
				),
				true
			);
		});
		it('returns true when contacts is not an array', () => {
			const questions = getQuestions({ answers: { hasAgent: 'no' } });

			const crossValidator = getCrossValidator(questions);
			assert.ok(crossValidator);

			assert.strictEqual(
				crossValidator.validationFunction('not-an-array', [{ id: 'org-1', organisationName: 'Org One' }]),
				true
			);
		});

		it('returns true when organisations is not an array', () => {
			const questions = getQuestions({ answers: { hasAgent: 'no' } });

			const crossValidator = getCrossValidator(questions);
			assert.ok(crossValidator);

			assert.strictEqual(crossValidator.validationFunction([{ applicantContactOrganisation: 'org-1' }], null), true);
		});

		it('throws when a contact references an organisation id that is not present in organisations', () => {
			const questions = getQuestions({ answers: { hasAgent: 'no' } });

			const crossValidator = getCrossValidator(questions);
			assert.ok(crossValidator);

			assert.throws(() => {
				crossValidator.validationFunction(
					[{ applicantContactOrganisation: 'org-1' }, { applicantContactOrganisation: 'org-2' }],
					[{ id: 'org-2', organisationName: 'Org Two' }]
				);
			}, /All applicant contacts must be associated with an applicant organisation/);
		});

		it('throws when an organisation is not referenced by any contact', () => {
			const questions = getQuestions({ answers: { hasAgent: 'no' } });

			const crossValidator = getCrossValidator(questions);
			assert.ok(crossValidator);

			assert.throws(() => {
				crossValidator.validationFunction(
					[{ applicantContactOrganisation: 'org-1' }],
					[
						{ id: 'org-1', organisationName: 'Org One' },
						{ id: 'org-2', organisationName: 'Org Two' }
					]
				);
			}, /You must add a contact for Org Two/);
		});
	});
});

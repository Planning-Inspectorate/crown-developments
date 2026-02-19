import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getApplicantContactsValidator } from './applicant-contacts-validator.js';

describe('getApplicantContactsValidator', () => {
	it('returns an empty array if hasAgentAnswer is true', () => {
		const result = getApplicantContactsValidator(true);
		assert(Array.isArray(result));
		assert.strictEqual(result.length, 0);
	});

	it('returns two validators if hasAgentAnswer is false', () => {
		const result = getApplicantContactsValidator(false);
		assert(Array.isArray(result));
		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0].constructor.name, 'CustomManageListValidator');
		assert.strictEqual(result[1].constructor.name, 'CrossQuestionValidator');
	});

	it('CustomManageListValidator requires at least one contact', () => {
		const [customValidator] = getApplicantContactsValidator(false);
		assert.strictEqual(customValidator.minimumAnswers, 1);
		assert.strictEqual(customValidator.errorMessages.minimumAnswers, 'At least one contact is required');
	});

	it('CrossQuestionValidator passes when all contacts are valid', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		const contacts = [{ applicantContactOrganisation: 'org1' }, { applicantContactOrganisation: 'org2' }];
		const applicants = [
			{ id: 'org1', organisationName: 'Org 1' },
			{ id: 'org2', organisationName: 'Org 2' }
		];
		assert.doesNotThrow(() => crossValidator.validationFunction(contacts, applicants));
	});

	it('CrossQuestionValidator throws if a contact is not linked to an applicant organisation', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		const contacts = [{ applicantContactOrganisation: 'org1' }, { applicantContactOrganisation: 'org3' }];
		const applicants = [
			{ id: 'org1', organisationName: 'Org 1' },
			{ id: 'org2', organisationName: 'Org 2' }
		];
		assert.throws(
			() => crossValidator.validationFunction(contacts, applicants),
			/All applicant contacts must be associated with an applicant organisation/
		);
	});

	it('CrossQuestionValidator throws if an applicant organisation has no contact', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		const contacts = [{ applicantContactOrganisation: 'org1' }];
		const applicants = [
			{ id: 'org1', organisationName: 'Org 1' },
			{ id: 'org2', organisationName: 'Org 2' }
		];
		assert.throws(() => crossValidator.validationFunction(contacts, applicants), /You must add a contact for Org 2/);
	});

	it('CrossQuestionValidator returns true if contacts or applicants are not arrays', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		assert.strictEqual(crossValidator.validationFunction(null, null), true);
		assert.strictEqual(crossValidator.validationFunction([], null), true);
		assert.strictEqual(crossValidator.validationFunction(null, []), true);
	});
});

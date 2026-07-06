import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getApplicantContactsValidator } from './applicant-contacts-validator.ts';

describe('getApplicantContactsValidator', () => {
	it('should return an empty array if hasAgentAnswer is true', () => {
		const result = getApplicantContactsValidator(true);
		assert(Array.isArray(result));
		assert.strictEqual(result.length, 0);
	});

	it('should return two validators if hasAgentAnswer is false', () => {
		const result = getApplicantContactsValidator(false);
		assert(Array.isArray(result));
		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0].constructor.name, 'CustomManageListValidator');
		assert.strictEqual(result[1].constructor.name, 'CrossQuestionValidator');
	});

	it('should require at least one contact in CustomManageListValidator', () => {
		const [customValidator] = getApplicantContactsValidator(false);
		assert.strictEqual(customValidator.minimumAnswers, 1);
		assert.strictEqual(customValidator.errorMessages.minimumAnswers, 'At least one contact is required');
	});

	it('should pass CrossQuestionValidator when all contacts are valid', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		const contacts = [{ applicantContactOrganisation: 'org1' }, { applicantContactOrganisation: 'org2' }];
		const applicants = [
			{ id: 'org1', organisationName: 'Org 1' },
			{ id: 'org2', organisationName: 'Org 2' }
		];
		assert.doesNotThrow(() => crossValidator.validationFunction(contacts, applicants));
	});

	it('should throw if a contact is not linked to an applicant organisation', () => {
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

	it('should throw if an applicant organisation has no contact', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		const contacts = [{ applicantContactOrganisation: 'org1' }];
		const applicants = [
			{ id: 'org1', organisationName: 'Org 1' },
			{ id: 'org2', organisationName: 'Org 2' }
		];
		assert.throws(() => crossValidator.validationFunction(contacts, applicants), /You must add a contact for Org 2/);
	});

	it('should fall back to "this organisation" if organisationName is missing', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		const contacts = [{ applicantContactOrganisation: 'org1' }];
		const applicants = [{ id: 'org1' }, { id: 'org2' }];
		assert.throws(
			() => crossValidator.validationFunction(contacts, applicants),
			/You must add a contact for this organisation/
		);
	});

	it('should return true if contacts or applicants are not arrays', () => {
		const [, crossValidator] = getApplicantContactsValidator(false);
		assert.strictEqual(crossValidator.validationFunction(null, null), true);
		assert.strictEqual(crossValidator.validationFunction([], null), true);
		assert.strictEqual(crossValidator.validationFunction(null, []), true);
	});

	describe('edge cases with optional IDs', () => {
		it('should throw if contact is missing applicantContactOrganisation', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{ applicantContactOrganisation: 'org1' }, {}];
			const applicants = [{ id: 'org1', organisationName: 'Org 1' }];
			assert.throws(
				() => crossValidator.validationFunction(contacts, applicants),
				/All applicant contacts must be associated with an applicant organisation/
			);
		});

		it('should throw if contact has undefined applicantContactOrganisation', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{ applicantContactOrganisation: 'org1' }, { applicantContactOrganisation: undefined }];
			const applicants = [{ id: 'org1', organisationName: 'Org 1' }];
			assert.throws(
				() => crossValidator.validationFunction(contacts, applicants),
				/All applicant contacts must be associated with an applicant organisation/
			);
		});

		it('should throw if applicant is missing id', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{ applicantContactOrganisation: 'org1' }];
			const applicants = [{ id: 'org1', organisationName: 'Org 1' }, { organisationName: 'Org Without ID' }];
			assert.throws(
				() => crossValidator.validationFunction(contacts, applicants),
				/You must add a contact for Org Without ID/
			);
		});

		it('should throw if applicant has undefined id', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{ applicantContactOrganisation: 'org1' }];
			const applicants = [
				{ id: 'org1', organisationName: 'Org 1' },
				{ id: undefined, organisationName: 'Org With Undefined ID' }
			];
			assert.throws(
				() => crossValidator.validationFunction(contacts, applicants),
				/You must add a contact for Org With Undefined ID/
			);
		});

		it('should pass with duplicate applicants when contact exists for that id', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{ applicantContactOrganisation: 'org1' }];
			const applicants = [
				{ id: 'org1', organisationName: 'Org 1' },
				{ id: 'org1', organisationName: 'Org 1 Duplicate' }
			];
			assert.doesNotThrow(() => crossValidator.validationFunction(contacts, applicants));
		});

		it('should throw with duplicate applicants when no contact exists for that id', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [];
			const applicants = [
				{ id: 'org1', organisationName: 'Org 1' },
				{ id: 'org1', organisationName: 'Org 1 Duplicate' }
			];
			assert.throws(() => crossValidator.validationFunction(contacts, applicants), /You must add a contact for Org 1/);
		});

		it('should throw when both contact and applicant have undefined IDs', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{}];
			const applicants = [{ organisationName: 'Org' }];
			assert.throws(
				() => crossValidator.validationFunction(contacts, applicants),
				/All applicant contacts must be associated with an applicant organisation/
			);
		});

		it('should throw when both contact and applicant have empty string IDs', () => {
			const [, crossValidator] = getApplicantContactsValidator(false);
			const contacts = [{ applicantContactOrganisation: '' }];
			const applicants = [{ id: '', organisationName: 'Org' }];
			assert.throws(
				() => crossValidator.validationFunction(contacts, applicants),
				/All applicant contacts must be associated with an applicant organisation/
			);
		});
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractApplicantContactFields } from './contact.js';

describe('extractApplicantContactFields', () => {
	it('returns trimmed contact fields when provided', () => {
		const result = extractApplicantContactFields({
			applicantFirstName: '  Alice  ',
			applicantLastName: '  Smith ',
			applicantContactEmail: '  alice@example.com  ',
			applicantContactTelephoneNumber: '  01234  '
		});

		assert.deepStrictEqual(result, {
			firstName: 'Alice',
			lastName: 'Smith',
			email: 'alice@example.com',
			telephoneNumber: '01234'
		});
	});

	it('returns nulls when fields are missing', () => {
		const result = extractApplicantContactFields({});
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});

	it('returns nulls when fields are empty or whitespace only', () => {
		const result = extractApplicantContactFields({
			applicantFirstName: '   ',
			applicantLastName: '\n\t',
			applicantContactEmail: '',
			applicantContactTelephoneNumber: ' '
		});
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});

	it('preserves null values as null', () => {
		const result = extractApplicantContactFields({
			applicantFirstName: null,
			applicantLastName: null,
			applicantContactEmail: null,
			applicantContactTelephoneNumber: null
		});
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});
});

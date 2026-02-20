import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractContactFields } from './contact.js';

describe('extractContactFields', () => {
	it('returns trimmed contact fields when provided', () => {
		const result = extractContactFields({
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
		const result = extractContactFields({});
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});

	it('returns nulls when fields are empty or whitespace only', () => {
		const result = extractContactFields({
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
		const result = extractContactFields({
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

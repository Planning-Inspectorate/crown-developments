import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractApplicantContactFields, extractAgentContactFields } from './contact.js';

describe('extractApplicantContactFields', () => {
	it('should return trimmed contact fields when provided', () => {
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

	it('should return nulls when fields are missing', () => {
		const result = extractApplicantContactFields({});
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});

	it('should return nulls when fields are empty or whitespace only', () => {
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

	it('should preserve null values as null', () => {
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

describe('extractAgentContactFields', () => {
	it('should return trimmed agent contact fields when all fields are present', () => {
		const input = {
			agentFirstName: ' John ',
			agentLastName: ' Doe ',
			agentContactEmail: ' john.doe@example.com ',
			agentContactTelephoneNumber: ' 0123456789 '
		};
		const result = extractAgentContactFields(input);
		assert.deepStrictEqual(result, {
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			telephoneNumber: '0123456789'
		});
	});

	it('should return null for missing agent contact fields', () => {
		const input = {};
		const result = extractAgentContactFields(input);
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});

	it('should return null for whitespace-only agent contact fields', () => {
		const input = {
			agentFirstName: '   ',
			agentLastName: '\t',
			agentContactEmail: '\n',
			agentContactTelephoneNumber: '    '
		};
		const result = extractAgentContactFields(input);
		assert.deepStrictEqual(result, {
			firstName: null,
			lastName: null,
			email: null,
			telephoneNumber: null
		});
	});

	it('should handle a mix of present, missing, and whitespace-only fields', () => {
		const input = {
			agentFirstName: ' Alice ',
			agentLastName: undefined,
			agentContactEmail: '   ',
			agentContactTelephoneNumber: '01234'
		};
		const result = extractAgentContactFields(input);
		assert.deepStrictEqual(result, {
			firstName: 'Alice',
			lastName: null,
			email: null,
			telephoneNumber: '01234'
		});
	});
});

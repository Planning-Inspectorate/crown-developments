import { describe, it } from 'node:test';
import assert from 'node:assert';
import NameValidator from './name-validator.ts';

async function getValidationErrors(value: string, question: { fieldName: string }, label: string) {
	const req = { body: { [question.fieldName]: value } };
	const validationResult = await new NameValidator({ label }).validate(question).run(req);
	return validationResult.array();
}

describe('NameValidator', () => {
	const question = { fieldName: 'contactName' };

	it('should accept a standard alphabetic name', async () => {
		const errors = await getValidationErrors('John', question, 'First name');
		assert.strictEqual(errors.length, 0);
	});

	it('should accept a name with spaces, hyphens, and apostrophes', async () => {
		const errors = await getValidationErrors("Sarah Jane O'Connor-Smith", question, 'Last name');
		assert.strictEqual(errors.length, 0);
	});

	it('should reject a name containing numbers', async () => {
		const errors = await getValidationErrors('John123', question, 'First name');
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, 'First name must only include letters, spaces, hyphens and apostrophes');
	});

	it('should reject a name containing disallowed special characters', async () => {
		const errors = await getValidationErrors('Jane@Doe!', question, 'Contact name');
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, 'Contact name must only include letters, spaces, hyphens and apostrophes');
	});

	it('should reject a name longer than 250 characters', async () => {
		const overlyLongName = 'A'.repeat(251);
		const errors = await getValidationErrors(overlyLongName, question, 'First name');

		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, 'First name must be between 1 and 250 characters');
	});

	it('should accept a name exactly 250 characters long', async () => {
		const exactMaxLengthName = 'A'.repeat(250);
		const errors = await getValidationErrors(exactMaxLengthName, question, 'First name');
		assert.strictEqual(errors.length, 0);
	});

	it('should accept a name containing diacritics', async () => {
		const errors = await getValidationErrors('João Öztürk Sánchez Çelik Łuka Dvořák', question, 'Last name');
		assert.strictEqual(errors.length, 0);
	});

	it('should accept an empty string', async () => {
		const errors = await getValidationErrors('', question, 'First name');
		assert.strictEqual(errors.length, 0);
	});

	describe('allowNumbers', () => {
		async function getErrors(value: string, label: string) {
			const req = { body: { [question.fieldName]: value } };
			const result = await new NameValidator({ label, allowNumbers: true }).validate(question).run(req);
			return result.array();
		}

		it('should accept a name containing numbers', async () => {
			const errors = await getErrors("Jane O'Connor-Smith 2nd", 'First name');
			assert.strictEqual(errors.length, 0);
		});

		it('should reject disallowed special characters with a message that mentions numbers', async () => {
			const errors = await getErrors('Jane@Doe!', 'Last name');
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Last name must only include letters, spaces, hyphens, apostrophes or numbers');
		});
	});
});

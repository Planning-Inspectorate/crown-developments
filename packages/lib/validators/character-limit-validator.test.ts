import assert from 'node:assert';
import { describe, it } from 'node:test';
import { validationResult } from 'express-validator';
import { CharacterLimitValidator, countCharacters } from './character-limit-validator.ts';

async function errors(maxLength: number, value: unknown): Promise<string[]> {
	const req = { body: { comment: value } };
	await new CharacterLimitValidator(maxLength).validate({ fieldName: 'comment' })[0].run(req);
	return validationResult(req)
		.array()
		.map((error) => String(error.msg));
}

describe('CharacterLimitValidator', () => {
	it('should allow up to the limit', async () => {
		assert.deepStrictEqual(await errors(5, 'abcde'), []);
	});
	it('should say how many characters too many', async () => {
		assert.deepStrictEqual(await errors(5, 'abcdefg'), ['You have 2 characters too many']);
		assert.deepStrictEqual(await errors(5, 'abcdef'), ['You have 1 character too many']);
		assert.deepStrictEqual(await errors(65000, 'a'.repeat(66234)), ['You have 1,234 characters too many']);
	});
	it('should count a line break as one character, like the counter', async () => {
		assert.strictEqual(countCharacters('a\r\nb'), 3);
		assert.deepStrictEqual(await errors(3, 'a\r\nb'), []);
	});
	it('should leave missing values to the required validator', async () => {
		assert.deepStrictEqual(await errors(5, undefined), []);
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import RequiredGroupValidator from './required-group-validator.ts';

describe('RequiredGroupValidator', () => {
	const fieldNames = ['bedroomsUnknown', 'bedroomsOne', 'bedroomsTwo'] as const;

	const buildValidator = () =>
		new RequiredGroupValidator({
			fieldNames,
			errorMessage: 'Enter a number of bedrooms'
		});

	const run = async (body: Record<string, unknown>) => {
		const req = { body };
		await buildValidator()
			.validate()
			.run(req as never);
		return validationResult(req as never);
	};

	it('passes when one of the fields has a value', async () => {
		const result = await run({ bedroomsUnknown: '', bedroomsOne: '4', bedroomsTwo: '' });

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when the field with a value is the first one', async () => {
		const result = await run({ bedroomsUnknown: '2', bedroomsOne: '', bedroomsTwo: '' });

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when the field with a value is the last one', async () => {
		const result = await run({ bedroomsUnknown: '', bedroomsOne: '', bedroomsTwo: '6' });

		assert.strictEqual(result.isEmpty(), true);
	});

	it('treats a zero as an answer, not as empty', async () => {
		const result = await run({ bedroomsUnknown: '0', bedroomsOne: '', bedroomsTwo: '' });

		assert.strictEqual(result.isEmpty(), true);
	});

	it('fails when every field is an empty string', async () => {
		const result = await run({ bedroomsUnknown: '', bedroomsOne: '', bedroomsTwo: '' });

		assert.strictEqual(result.isEmpty(), false);

		const [error] = result.array();
		assert.strictEqual(error.msg, 'Enter a number of bedrooms');
		assert.strictEqual(error.type, 'field');
		// attached to the first field so the error summary links to the first input
		assert.strictEqual((error as { path: string }).path, 'bedroomsUnknown');
	});

	it('fails when the fields are whitespace only', async () => {
		const result = await run({ bedroomsUnknown: '  ', bedroomsOne: '\t', bedroomsTwo: ' ' });

		assert.strictEqual(result.isEmpty(), false);
	});

	it('fails when the fields are absent from the body', async () => {
		const result = await run({});

		assert.strictEqual(result.isEmpty(), false);
	});

	it('fails when the fields are null', async () => {
		const result = await run({ bedroomsUnknown: null, bedroomsOne: null, bedroomsTwo: null });

		assert.strictEqual(result.isEmpty(), false);
	});

	it('ignores fields outside the configured group', async () => {
		const result = await run({ bedroomsUnknown: '', bedroomsOne: '', bedroomsTwo: '', bedroomsFourPlus: '9' });

		assert.strictEqual(result.isEmpty(), false);
	});

	it('reports only one error, not one per field', async () => {
		const result = await run({ bedroomsUnknown: '', bedroomsOne: '', bedroomsTwo: '' });

		assert.strictEqual(result.array().length, 1);
	});

	it('throws when constructed with no field names', () => {
		assert.throws(
			() => new RequiredGroupValidator({ fieldNames: [], errorMessage: 'Enter a number of bedrooms' }),
			/requires at least one field name/
		);
	});
});

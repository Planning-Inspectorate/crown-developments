import type { OptionsQuestion } from '@planning-inspectorate/dynamic-forms';
import { validationResult } from 'express-validator';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import MultiConditionalNumericValidator from './multi-conditional-numeric-validator.ts';

describe('MultiConditionalNumericValidator', () => {
	const questionObj = {
		fieldName: 'voidCapacityUnitId',
		options: [
			{ text: 'Cubic metres', value: 'cubic-metres', conditional: { fieldName: 'cubic-metres' } },
			{ text: 'Tonnes', value: 'tonnes', conditional: { fieldName: 'tonnes' } },
			{ text: 'Litres', value: 'litres', conditional: { fieldName: 'litres' } }
		]
	} as unknown as OptionsQuestion;

	const buildValidator = () =>
		new MultiConditionalNumericValidator({
			regexMessage: 'Total capacity of the void must be a number'
		});

	const run = async (body: Record<string, unknown>, question: OptionsQuestion = questionObj) => {
		const req = { body };
		const chains = buildValidator().validate(question);

		for (const chain of chains) {
			await chain.run(req as never);
		}

		return validationResult(req as never);
	};

	it('passes when the selected unit has a whole number', async () => {
		const result = await run({
			voidCapacityUnitId: 'tonnes',
			voidCapacityUnitId_tonnes: '55'
		});

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when the selected unit has a decimal', async () => {
		const result = await run({
			voidCapacityUnitId: 'litres',
			voidCapacityUnitId_litres: '12.5'
		});

		assert.strictEqual(result.isEmpty(), true);
	});

	it('fails when the selected unit has a non-numeric value', async () => {
		const result = await run({
			voidCapacityUnitId: 'tonnes',
			voidCapacityUnitId_tonnes: 'abc'
		});

		assert.strictEqual(result.isEmpty(), false);

		const errors = result.mapped();
		assert.strictEqual(errors['voidCapacityUnitId_tonnes'].msg, 'Total capacity of the void must be a number');
	});

	it('ignores non-numeric values in the units that were not selected', async () => {
		// Hidden reveals still submit their inputs, so all three arrive on every post
		const result = await run({
			voidCapacityUnitId: 'tonnes',
			'voidCapacityUnitId_cubic-metres': 'nonsense',
			voidCapacityUnitId_tonnes: '55',
			voidCapacityUnitId_litres: 'also nonsense'
		});

		assert.strictEqual(result.isEmpty(), true);
	});

	it('does not report an empty value, leaving that to ConditionalRequiredValidator', async () => {
		const result = await run({
			voidCapacityUnitId: 'tonnes',
			voidCapacityUnitId_tonnes: ''
		});

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when no unit was selected', async () => {
		const result = await run({
			voidCapacityUnitId_tonnes: 'abc'
		});

		assert.strictEqual(result.isEmpty(), true);
	});

	it('rejects a negative number', async () => {
		const result = await run({
			voidCapacityUnitId: 'tonnes',
			voidCapacityUnitId_tonnes: '-5'
		});

		assert.strictEqual(result.isEmpty(), false);
	});

	it('rejects a value with a thousands separator', async () => {
		const result = await run({
			voidCapacityUnitId: 'tonnes',
			voidCapacityUnitId_tonnes: '1,000'
		});

		assert.strictEqual(result.isEmpty(), false);
	});

	it('honours a custom regex', async () => {
		const validator = new MultiConditionalNumericValidator({
			regex: /^\d+$/,
			regexMessage: 'Must be a whole number'
		});

		const req = { body: { voidCapacityUnitId: 'tonnes', voidCapacityUnitId_tonnes: '12.5' } };
		for (const chain of validator.validate(questionObj)) {
			await chain.run(req as never);
		}

		const result = validationResult(req as never);
		assert.strictEqual(result.isEmpty(), false);
		assert.strictEqual(result.mapped()['voidCapacityUnitId_tonnes'].msg, 'Must be a whole number');
	});

	it('builds no chains when no option has a conditional', async () => {
		const plainQuestion = {
			fieldName: 'someRadio',
			options: [
				{ text: 'Yes', value: 'yes' },
				{ text: 'No', value: 'no' }
			]
		} as unknown as OptionsQuestion;

		const chains = buildValidator().validate(plainQuestion);

		assert.strictEqual(chains.length, 0);
	});

	it('handles an array value, as submitted by checkboxes', async () => {
		const result = await run({
			voidCapacityUnitId: ['tonnes'],
			voidCapacityUnitId_tonnes: 'abc'
		});

		assert.strictEqual(result.isEmpty(), false);
	});
});

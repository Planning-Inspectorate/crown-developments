import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import UniqueListFieldValidator from './unique-list-field-validator.ts';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

describe('UniqueListFieldValidator', () => {
	const questionObj = { fieldName: 'wasteTypeId' } as unknown as Question;

	const buildValidator = () =>
		new UniqueListFieldValidator({
			listFieldName: 'manageWasteTypes',
			displayNameFor: (id) => (id === 'inert-landfill' ? 'Inert landfill' : id),
			buildErrorMessage: (name) =>
				`You have already added ${name}. Select a different waste type or change the existing entry`
		});

	const buildReq = (items: Record<string, unknown>[], body: Record<string, unknown>, params = {}) => ({
		body,
		params,
		res: {
			locals: {
				journeyResponse: {
					answers: { manageWasteTypes: items }
				}
			}
		}
	});

	const run = async (req: unknown) => {
		await buildValidator()
			.validate(questionObj)
			.run(req as never);
		return validationResult(req as never);
	};

	it('passes when the value is not already in the list', async () => {
		const req = buildReq(
			[{ id: 'row-1', wasteTypeId: 'inert-landfill' }],
			{ wasteTypeId: 'hazardous-landfill' },
			{ manageListItemId: 'row-2' }
		);

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('fails when another item already has the value', async () => {
		const req = buildReq(
			[{ id: 'row-1', wasteTypeId: 'inert-landfill' }],
			{ wasteTypeId: 'inert-landfill' },
			{ manageListItemId: 'row-2' }
		);

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), false);

		const [error] = result.array();
		assert.strictEqual(
			error.msg,
			'You have already added Inert landfill. Select a different waste type or change the existing entry'
		);
		assert.strictEqual(error.type, 'field');
		assert.strictEqual((error as { path: string }).path, 'wasteTypeId');
	});

	it('passes when editing an item and leaving its own value unchanged', async () => {
		const req = buildReq(
			[
				{ id: 'row-1', wasteTypeId: 'inert-landfill' },
				{ id: 'row-2', wasteTypeId: 'hazardous-landfill' }
			],
			{ wasteTypeId: 'inert-landfill' },
			{ manageListItemId: 'row-1' }
		);

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('fails when editing an item to a value another item already has', async () => {
		const req = buildReq(
			[
				{ id: 'row-1', wasteTypeId: 'inert-landfill' },
				{ id: 'row-2', wasteTypeId: 'hazardous-landfill' }
			],
			{ wasteTypeId: 'hazardous-landfill' },
			{ manageListItemId: 'row-1' }
		);

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), false);
	});

	it('passes when the list is empty', async () => {
		const req = buildReq([], { wasteTypeId: 'inert-landfill' }, { manageListItemId: 'row-1' });

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when the list is missing from the answers', async () => {
		const req = {
			body: { wasteTypeId: 'inert-landfill' },
			params: { manageListItemId: 'row-1' },
			res: { locals: { journeyResponse: { answers: {} } } }
		};

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when there is no journeyResponse on the request', async () => {
		const req = {
			body: { wasteTypeId: 'inert-landfill' },
			params: {},
			res: { locals: {} }
		};

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('passes when no value was submitted, leaving that to the required validator', async () => {
		const req = buildReq([{ id: 'row-1', wasteTypeId: 'inert-landfill' }], { wasteTypeId: '' });

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('ignores items that have not yet answered the field', async () => {
		const req = buildReq(
			[{ id: 'row-1' }, { id: 'row-2', wasteTypeId: undefined }],
			{ wasteTypeId: 'inert-landfill' },
			{ manageListItemId: 'row-3' }
		);

		const result = await run(req);

		assert.strictEqual(result.isEmpty(), true);
	});

	it('falls back to the raw value when no displayNameFor is given', async () => {
		const validator = new UniqueListFieldValidator({
			listFieldName: 'manageWasteTypes',
			buildErrorMessage: (name) => `Already added ${name}`
		});

		const req = buildReq([{ id: 'row-1', wasteTypeId: 'inert-landfill' }], { wasteTypeId: 'inert-landfill' });

		await validator.validate(questionObj).run(req as never);
		const result = validationResult(req as never);

		assert.strictEqual(result.array()[0].msg, 'Already added inert-landfill');
	});
});

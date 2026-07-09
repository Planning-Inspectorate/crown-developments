import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildS62aUpdateCase } from './update-case.ts';
import type { Request, Response } from 'express';
import type { SaveParams } from '@planning-inspectorate/dynamic-forms';
import type { ManageService } from '../../../../service.js';

describe('buildS62aUpdateCase', () => {
	let mockDbUpdateCalls: any[];
	let mockLoggerInfoCalls: any[];
	let mockService: ManageService;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockDbUpdateCalls = [];
		mockLoggerInfoCalls = [];

		mockService = {
			db: {
				s62aCase: {
					update: async (args: unknown) => {
						mockDbUpdateCalls.push(args);
						return { id: 'case-123' };
					}
				}
			},
			logger: {
				info: (meta: unknown, msg: string) => mockLoggerInfoCalls.push({ meta, msg }),
				error: () => {}
			}
		} as unknown as ManageService;

		mockReq = {
			params: { id: 'case-123' }
		};

		mockRes = {};
	});

	it('bails early and does not call DB if answers payload is empty', async () => {
		const handler = buildS62aUpdateCase(mockService);

		await handler({
			req: mockReq,
			res: mockRes,
			data: { answers: {} }
		} as unknown as SaveParams);

		assert.strictEqual(mockDbUpdateCalls.length, 0, 'Database update should not be called');
		assert.strictEqual(mockLoggerInfoCalls[1]?.msg, 'No case updates to apply', 'Should log the early exit reason');
	});

	it('bails early and does not call DB if answers do not map to any valid update fields', async () => {
		const handler = buildS62aUpdateCase(mockService);

		await handler({
			req: mockReq,
			res: mockRes,
			data: { answers: { developmentDescription: undefined } }
		} as unknown as SaveParams);

		assert.strictEqual(mockDbUpdateCalls.length, 0, 'Database update should not be called');
		assert.strictEqual(
			mockLoggerInfoCalls[1]?.msg,
			'No valid database fields mapped for update',
			'Should log the mapper early exit reason'
		);
	});

	it('successfully calls Prisma update with mapped input and current date', async () => {
		const handler = buildS62aUpdateCase(mockService);

		await handler({
			req: mockReq,
			res: mockRes,
			data: { answers: { developmentDescription: 'An updated description' } }
		} as unknown as SaveParams);

		assert.strictEqual(mockDbUpdateCalls.length, 1, 'Database update should be called exactly once');

		const updateArgs = mockDbUpdateCalls[0];

		assert.deepStrictEqual(updateArgs.where, { id: 'case-123' }, 'Should query by the correct case ID');
		assert.strictEqual(updateArgs.data.description, 'An updated description', 'Should map the description');
		assert.ok(updateArgs.data.updatedDate instanceof Date, 'Should append a new updatedDate timestamp');

		assert.strictEqual(mockLoggerInfoCalls[1]?.msg, 'S62A case updated successfully', 'Should log success');
	});

	it('catches and delegates Prisma errors to wrapPrismaError', async () => {
		(mockService.db.s62aCase as any).update = async () => {
			throw new Error('Database connection failed');
		};

		const handler = buildS62aUpdateCase(mockService);

		await assert.rejects(async () => {
			await handler({
				req: mockReq,
				res: mockRes,
				data: { answers: { developmentDescription: 'Valid update' } }
			} as unknown as SaveParams);
		});
	});
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildS62aUpdateCase } from './update-case.ts';
import type { Request, Response } from 'express';
import type { SaveParams } from '@planning-inspectorate/dynamic-forms';
import type { ManageService } from '../../../../service.js';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

describe('buildS62aUpdateCase', () => {
	let mockDbSelectCalls: any[];
	let mockDbUpdateCalls: any[];
	let mockLoggerInfoCalls: any[];
	let mockLoggerWarnCalls: Array<{ msg: string; [key: string]: unknown }> = [];
	let mockFolderFindFirstCalls: unknown[];
	let mockFolderCreateCalls: Array<{ data: Record<string, unknown> }>;
	let existingAdviceFolder: { id: string } | null;
	let caseRecord: Record<string, unknown>;
	let mockService: ManageService;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockDbUpdateCalls = [];
		mockDbSelectCalls = [];
		mockLoggerInfoCalls = [];
		mockLoggerWarnCalls = [];
		mockFolderFindFirstCalls = [];
		mockFolderCreateCalls = [];
		existingAdviceFolder = null;
		caseRecord = { id: 'case-123' };

		const folder = {
			findFirst: async (args: unknown) => {
				mockFolderFindFirstCalls.push(args);
				return existingAdviceFolder;
			},
			create: async (args: { data: Record<string, unknown> }) => {
				mockFolderCreateCalls.push(args);
				return { id: 'folder-1' };
			}
		};

		mockService = {
			db: {
				s62aCase: {
					findUnique: async (args: unknown) => {
						mockDbSelectCalls.push(args);
						return caseRecord;
					},
					update: async (args: unknown) => {
						mockDbUpdateCalls.push(args);
						return { id: 'case-123' };
					}
				},
				// Runs the callback against the same s62aCase mock, so tests that
				// override update still take effect inside the transaction
				$transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({ s62aCase: mockService.db.s62aCase, folder })
			},
			logger: {
				info: (obj: unknown, msg?: string) => {
					mockLoggerInfoCalls.push(typeof obj === 'string' ? { msg: obj } : { ...(obj as object), msg });
				},
				error: () => {},
				warn: (obj: unknown, msg?: string) => {
					mockLoggerWarnCalls.push(typeof obj === 'string' ? { msg: obj } : { ...(obj as object), msg });
				}
			}
		} as unknown as ManageService;

		mockReq = {
			params: { id: 'case-123' },
			session: {}
		} as unknown as Request;

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

	describe('pre-application advice folder', () => {
		const save = (answers: Record<string, unknown>, clearAnswer = false) =>
			buildS62aUpdateCase(
				mockService,
				clearAnswer
			)({
				req: mockReq,
				res: mockRes,
				data: { answers }
			} as unknown as SaveParams);

		const onApplication = () => {
			caseRecord = { id: 'case-123', applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION };
		};

		it('creates the folder when the advice is changed to Yes - PINS', async () => {
			onApplication();

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS });

			assert.strictEqual(mockFolderCreateCalls.length, 1);
			assert.strictEqual(mockFolderCreateCalls[0].data.displayName, 'Pre-application advice');
			assert.strictEqual(mockFolderCreateCalls[0].data.s62aCaseId, 'case-123');
		});

		it('creates the folder when the advice is changed to Yes - Council', async () => {
			onApplication();

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL });

			assert.strictEqual(mockFolderCreateCalls.length, 1);
		});

		it('does not create a second folder when the case already has one', async () => {
			onApplication();
			existingAdviceFolder = { id: 'folder-existing' };

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL });

			assert.strictEqual(mockFolderFindFirstCalls.length, 1);
			assert.strictEqual(mockFolderCreateCalls.length, 0);
		});

		it('does not create the folder when the advice is No', async () => {
			onApplication();

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO });

			assert.strictEqual(mockFolderFindFirstCalls.length, 0);
			assert.strictEqual(mockFolderCreateCalls.length, 0);
		});

		it('does not create the folder on Remove and save', async () => {
			onApplication();

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS }, true);

			assert.strictEqual(mockFolderCreateCalls.length, 0);
		});

		it('does not create the folder on a pre-application case', async () => {
			caseRecord = { id: 'case-123', applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION };

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS });

			assert.strictEqual(mockFolderCreateCalls.length, 0);
		});

		it('does not touch folders when an unrelated field is saved', async () => {
			onApplication();

			await save({ developmentDescription: 'An updated description' });

			assert.strictEqual(mockFolderFindFirstCalls.length, 0);
			assert.strictEqual(mockFolderCreateCalls.length, 0);
		});

		it('saves the case and the folder together', async () => {
			onApplication();

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS });

			assert.strictEqual(mockDbUpdateCalls.length, 1);
			assert.strictEqual(mockFolderCreateCalls.length, 1);
			assert.ok(mockLoggerInfoCalls.some((call) => call.msg === 'created pre-application advice folder'));
		});
	});
});

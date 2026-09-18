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
import { FOLDER_SYNC_RESULT } from '../util/folders.ts';

type FolderUpdateArgs = { where: { id: string }; data: { deletedAt: Date | null } };

describe('buildS62aUpdateCase', () => {
	let mockDbSelectCalls: any[];
	let mockDbUpdateCalls: any[];
	let mockLoggerInfoCalls: any[];
	let mockLoggerWarnCalls: Array<{ msg: string; [key: string]: unknown }> = [];
	let mockFolderFindFirstCalls: unknown[];
	let mockFolderCreateCalls: Array<{ data: Record<string, unknown> }>;
	let mockFolderUpdateCalls: FolderUpdateArgs[];
	let liveAdviceFolder: { id: string } | null;
	let deletedAdviceFolder: { id: string } | null;
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
		mockFolderUpdateCalls = [];
		liveAdviceFolder = null;
		deletedAdviceFolder = null;
		caseRecord = { id: 'case-123' };

		const folder = {
			// The helper looks up the live folder first, then any soft-deleted one
			findFirst: async (args: { where: { deletedAt: unknown } }) => {
				mockFolderFindFirstCalls.push(args);
				return args.where.deletedAt === null ? liveAdviceFolder : deletedAdviceFolder;
			},
			create: async (args: { data: Record<string, unknown> }) => {
				mockFolderCreateCalls.push(args);
				return { id: 'folder-new' };
			},
			update: async (args: FolderUpdateArgs) => {
				mockFolderUpdateCalls.push(args);
				return { id: args.where.id };
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
		const save = (answers: Record<string, unknown>) =>
			buildS62aUpdateCase(mockService)({
				req: mockReq,
				res: mockRes,
				data: { answers }
			} as unknown as SaveParams);

		const onApplication = () => {
			caseRecord = { id: 'case-123', applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION };
		};

		const loggedChange = () =>
			mockLoggerInfoCalls.find((call) => call.msg === 'synced pre-application advice folder')?.change;

		describe('Yes - PINS or Yes - Council', () => {
			it('creates the folder when the case has never had one', async () => {
				onApplication();

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS });

				assert.strictEqual(mockFolderCreateCalls.length, 1);
				assert.strictEqual(mockFolderCreateCalls[0].data.displayName, 'Pre-application advice');
				assert.strictEqual(mockFolderCreateCalls[0].data.s62aCaseId, 'case-123');
				assert.strictEqual(loggedChange(), FOLDER_SYNC_RESULT.CREATED);
			});

			it('does the same for council advice', async () => {
				onApplication();

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL });

				assert.strictEqual(mockFolderCreateCalls.length, 1);
			});

			it('leaves an existing folder alone', async () => {
				onApplication();
				liveAdviceFolder = { id: 'folder-live' };

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL });

				assert.strictEqual(mockFolderCreateCalls.length, 0);
				assert.strictEqual(mockFolderUpdateCalls.length, 0);
				assert.strictEqual(loggedChange(), undefined, 'nothing changed, so nothing is logged');
			});

			it('restores a folder removed by an earlier No, rather than creating a new one', async () => {
				onApplication();
				deletedAdviceFolder = { id: 'folder-deleted' };

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS });

				assert.deepStrictEqual(mockFolderUpdateCalls, [{ where: { id: 'folder-deleted' }, data: { deletedAt: null } }]);
				assert.strictEqual(mockFolderCreateCalls.length, 0);
				assert.strictEqual(loggedChange(), FOLDER_SYNC_RESULT.RESTORED);
			});
		});

		describe('No', () => {
			it('soft-deletes the folder', async () => {
				onApplication();
				liveAdviceFolder = { id: 'folder-live' };

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO });

				assert.strictEqual(mockFolderUpdateCalls.length, 1);
				assert.deepStrictEqual(mockFolderUpdateCalls[0].where, { id: 'folder-live' });
				assert.ok(mockFolderUpdateCalls[0].data.deletedAt instanceof Date);
				assert.strictEqual(mockFolderCreateCalls.length, 0);
				assert.strictEqual(loggedChange(), FOLDER_SYNC_RESULT.DELETED);
			});

			it('does nothing when there is no folder to delete', async () => {
				onApplication();

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO });

				assert.strictEqual(mockFolderUpdateCalls.length, 0);
				assert.strictEqual(mockFolderCreateCalls.length, 0);
			});
		});

		describe('when the folder is left alone', () => {
			it('ignores a pre-application case', async () => {
				caseRecord = { id: 'case-123', applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION };
				liveAdviceFolder = { id: 'folder-live' };

				await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO });

				assert.strictEqual(mockFolderFindFirstCalls.length, 0);
				assert.strictEqual(mockFolderUpdateCalls.length, 0);
			});

			it('ignores a save of an unrelated field', async () => {
				onApplication();
				liveAdviceFolder = { id: 'folder-live' };

				await save({ developmentDescription: 'An updated description' });

				assert.strictEqual(mockFolderFindFirstCalls.length, 0);
				assert.strictEqual(mockFolderUpdateCalls.length, 0);
			});
		});

		it('saves the case and the folder change in the same transaction', async () => {
			onApplication();

			await save({ preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS });

			assert.strictEqual(mockDbUpdateCalls.length, 1);
			assert.strictEqual(mockFolderCreateCalls.length, 1);
		});
	});
});

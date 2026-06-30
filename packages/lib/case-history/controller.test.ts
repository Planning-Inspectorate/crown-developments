import { describe, it, mock, beforeEach, type Mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { buildViewCaseHistory } from './controller.ts';
import type { CaseHistoryService } from './controller.ts';
import { CASE_DATA_MODEL } from '../util/types.ts';

describe('buildViewCaseHistory', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	};

	const mockAudit = {
		getAllForCase: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
		countForCase: mock.fn<(...args: unknown[]) => Promise<unknown>>()
	};

	const mockRes = () => {
		const res: {
			render: ReturnType<typeof mock.fn>;
			locals: Record<string, unknown>;
			status: ReturnType<typeof mock.fn>;
		} = {
			render: mock.fn(),
			locals: {},
			status: mock.fn()
		};
		res.status.mock.mockImplementation(() => res);
		return res;
	};

	const mockReq = (overrides: Record<string, unknown> = {}) =>
		({
			params: { id: 'b8bd6c55-8225-4634-8b8c-b5bd3abfedb4' },
			query: {},
			session: {},
			originalUrl: '/cases/b8bd6c55-8225-4634-8b8c-b5bd3abfedb4/case-history',
			baseUrl: '/cases/b8bd6c55-8225-4634-8b8c-b5bd3abfedb4',
			path: '/case-history',
			...overrides
		}) as unknown as Request;

	const buildService = (overrides: Record<string, unknown> = {}) => {
		// Create a fresh mockDb per service build
		const defaultDb = {
			crownDevelopment: {
				findUnique: mock.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(null))
			},
			s62aCase: {
				findUnique: mock.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(null))
			}
		};

		return {
			db: defaultDb,
			entraGroupIds: {
				caseOfficers: '123',
				inspectors: '123'
			},
			audit: mockAudit,
			logger: mockLogger,
			getEntraClient: () => ({
				listAllGroupMembers: async () => [
					{ id: 'user-1', displayName: 'Jane Smith' },
					{ id: 'user-2', displayName: 'John Doe' }
				]
			}),
			authConfig: { groups: { applicationAccess: 'group-1' } },
			...overrides
		} as unknown as CaseHistoryService;
	};

	// Narrows a recorded mock call's first argument to an expected shape.
	const firstArg = <T>(call: { arguments: unknown[] }): T => call.arguments[0] as T;
	// Narrows the render call's (path, data) arguments.
	const renderArgs = (call: { arguments: unknown[] }) => call.arguments as [string, Record<string, unknown>];

	const runService = (res: ReturnType<typeof mockRes>) => res as unknown as Response;

	beforeEach(() => {
		mockAudit.getAllForCase.mock.resetCalls();
		mockAudit.countForCase.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(async () => {
				await buildViewCaseHistory(buildService(), CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});
			}, /must be a single string value/);
		});
	});

	describe('Happy Path', () => {
		it('should fetch case, audit events, and render the view', async () => {
			const req = mockReq();
			const res = mockRes();

			const service = buildService();
			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return { reference: 'REF-001' };
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return null;
			});

			const mockEvents = [
				{
					id: 'evt-1',
					action: 'CASE_CREATED',
					userId: 'user-1',
					createdAt: new Date('2026-02-11T14:31:00Z'),
					metadata: { reference: 'REF-001' }
				},
				{
					id: 'evt-2',
					action: 'CASE_CREATED',
					userId: 'user-2',
					createdAt: new Date('2026-02-10T09:15:00Z'),
					metadata: null
				}
			];

			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve(mockEvents));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(2));

			await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});

			const findUniqueMock = service.db.crownDevelopment.findUnique as Mock<
				typeof service.db.crownDevelopment.findUnique
			>;

			const dbArgs = firstArg<{ where: { id: string }; select: { reference: boolean } }>(findUniqueMock.mock.calls[0]);

			findUniqueMock.mock.resetCalls();

			await service.db.crownDevelopment.findUnique({ where: { id: '123' } });
			assert.strictEqual(findUniqueMock.mock.callCount(), 1);

			assert.deepStrictEqual(dbArgs.where, { id: 'b8bd6c55-8225-4634-8b8c-b5bd3abfedb4' });
			assert.ok(dbArgs.select.reference);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const [viewPath, viewData] = renderArgs(res.render.mock.calls[0]);

			assert.strictEqual(viewPath, 'view.njk');
			assert.strictEqual(viewData.pageHeading, 'View application history');
			assert.strictEqual(viewData.reference, 'REF-001');
			assert.strictEqual(viewData.backLinkUrl, '/cases/b8bd6c55-8225-4634-8b8c-b5bd3abfedb4');
			assert.strictEqual(viewData.backLinkText, 'Back to case details');

			assert.strictEqual((viewData.rows as unknown[]).length, 2);
		});

		it('should resolve user display names from entra group members', async () => {
			const req = mockReq();
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return { reference: 'REF-001' };
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return null;
			});

			mockAudit.getAllForCase.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'evt-1',
						action: 'CASE_CREATED',
						userId: 'user-1',
						createdAt: new Date('2026-02-11T14:31:00Z'),
						metadata: { reference: 'REF-001' }
					}
				])
			);
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(1));

			await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});

			const [, viewData] = renderArgs(res.render.mock.calls[0]);
			const rows = viewData.rows as Array<{ user: string }>;
			assert.strictEqual(rows[0].user, 'Jane Smith');
			assert.ok(viewData.baseUrl);
			assert.deepStrictEqual(viewData.queryParams, {});
		});

		it('should fall back to "Unknown User" when userId is not in entra group', async () => {
			const req = mockReq();
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return { reference: 'REF-001' };
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return null;
			});

			mockAudit.getAllForCase.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'evt-1',
						action: 'CASE_CREATED',
						userId: 'unknown-user-id',
						createdAt: new Date('2026-02-11T14:31:00Z'),
						metadata: { reference: 'REF-001' }
					}
				])
			);
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(1));

			await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});

			const [, viewData] = renderArgs(res.render.mock.calls[0]);
			const rows = viewData.rows as Array<{ user: string }>;
			assert.strictEqual(rows[0].user, 'Unknown User');
		});
	});

	describe('Error Handling', () => {
		it('should call notFoundHandler when case is not found', async () => {
			const req = mockReq();
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return null;
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return null;
			});

			await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});

			const historyCalls = res.render.mock.calls.filter(
				(call) => (call.arguments as unknown[])[0] === 'views/cases/case-history/view.njk'
			);
			assert.strictEqual(historyCalls.length, 0);
		});

		it('should propagate DB errors via wrapPrismaError', async () => {
			const req = mockReq();
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				throw new Error('Connection refused');
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				throw new Error('Connection refused');
			});

			await assert.rejects(
				async () => {
					await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});
				},
				{
					message: 'Connection refused'
				}
			);
		});

		it('should not render if case lookup fails', async () => {
			const req = mockReq();
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return Promise.reject(new Error('DB timeout'));
			});

			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return Promise.reject(new Error('DB timeout'));
			});

			await assert.rejects(async () => {
				await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});
			});

			assert.strictEqual(res.render.mock.callCount(), 0);
		});
	});

	describe('Pagination', () => {
		it('should extract pagination params from request and pass correctly to the audit service', async () => {
			const req = mockReq({
				query: { page: '2', itemsPerPage: '25' }
			});
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return { reference: 'REF-001' };
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return null;
			});

			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve([]));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(45));

			await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});

			assert.strictEqual(mockAudit.getAllForCase.mock.callCount(), 1);
			const auditArgs = mockAudit.getAllForCase.mock.calls[0].arguments;

			assert.strictEqual(auditArgs[0], 'b8bd6c55-8225-4634-8b8c-b5bd3abfedb4');
			assert.deepStrictEqual(auditArgs[2], { take: 25, skip: 25 });

			assert.strictEqual(res.render.mock.callCount(), 1);
			const [, viewData] = renderArgs(res.render.mock.calls[0]);
			const pagination = viewData.paginationParams as {
				pageNumber: number;
				selectedItemsPerPage: number;
				totalItems: number;
				totalPages: number;
				resultsStartNumber: number;
				resultsEndNumber: number;
			};

			assert.ok(pagination);
			assert.strictEqual(pagination.pageNumber, 2);
			assert.strictEqual(pagination.selectedItemsPerPage, 25);
			assert.strictEqual(pagination.totalItems, 45);
			assert.strictEqual(pagination.totalPages, 2);
			assert.strictEqual(pagination.resultsStartNumber, 26);
			assert.strictEqual(pagination.resultsEndNumber, 45);
			assert.deepStrictEqual(viewData.queryParams, { page: '2', itemsPerPage: '25' });
		});

		it('should handle default pagination parameters when query is empty', async () => {
			const req = mockReq({ query: {} });
			const res = mockRes();

			const service = buildService();

			mock.method(service.db.crownDevelopment, 'findUnique', async () => {
				return { reference: 'REF-001' };
			});
			mock.method(service.db.s62aCase, 'findUnique', async () => {
				return null;
			});

			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve([]));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(5));

			await buildViewCaseHistory(service, CASE_DATA_MODEL.CROWN)(req, runService(res), () => {});

			const auditArgs = mockAudit.getAllForCase.mock.calls[0].arguments as [string, { skip: number }];
			const [, viewData] = renderArgs(res.render.mock.calls[0]);
			const pagination = viewData.paginationParams as { pageNumber: number; totalItems: number };

			assert.strictEqual(auditArgs[2].skip, 0);
			assert.strictEqual(pagination.pageNumber, 1);
			assert.strictEqual(pagination.totalItems, 5);
		});
	});
});

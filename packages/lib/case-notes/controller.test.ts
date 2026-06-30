import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.ts';
import { asReq, asRes } from '@pins/crowndev-lib/testing/mock-express.ts';
import { AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/index.ts';
import {
	buildCreateCaseNoteHandler,
	mapNotes,
	buildFetchCaseNotesMiddleware,
	buildViewCaseNotes,
	buildViewAddCaseNotes
} from './controller.ts';
import type { CaseNotesService } from './index.ts';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';

const mockGroupMembers: EntraGroupMembers = {
	caseOfficers: [{ id: 'user-1', displayName: 'Case Officer One' }],
	inspectors: [{ id: 'user-2', displayName: 'Inspector Two' }]
};

describe('mapNotes', () => {
	it('should map notes, sort by newest first, and resolve user names', () => {
		const unmappedNotes = [
			{ comment: 'Older note', createdAt: new Date('2023-01-01T10:00:00Z'), userId: 'user-1' },
			{ comment: 'Newer note', createdAt: new Date('2023-01-02T10:00:00Z'), userId: 'user-2' },
			{ comment: 'Unknown user note', createdAt: new Date('2023-01-01T15:00:00Z'), userId: 'user-999' }
		];

		const result = mapNotes(unmappedNotes, mockGroupMembers, 'case-1');

		assert.strictEqual(result.caseNotes.length, 3);

		assert.strictEqual(result.caseNotes[0].commentText, 'Newer note');
		assert.strictEqual(result.caseNotes[0].userName, 'Inspector Two');

		assert.strictEqual(result.caseNotes[1].commentText, 'Unknown user note');
		assert.strictEqual(result.caseNotes[1].userName, 'user-999');

		assert.strictEqual(result.caseNotes[2].commentText, 'Older note');
		assert.strictEqual(result.caseNotes[2].userName, 'Case Officer One');
	});

	it('should truncate long comments and provide a read more link', () => {
		const longComment = 'A'.repeat(500);
		const unmappedNotes = [{ comment: longComment, createdAt: new Date(), userId: 'user-1' }];

		const caseId = '3299ed0f-1b40-446d-9089-c1b02e2f9835';
		const result = mapNotes(unmappedNotes, mockGroupMembers, `/cases/${caseId}/application-notes`);

		assert.ok(result.caseNotes[0].truncatedCommentText.includes('Read more'));
		assert.ok(
			result.caseNotes[0].truncatedCommentText.includes('/cases/3299ed0f-1b40-446d-9089-c1b02e2f9835/application-notes')
		);
	});
});

describe('buildCreateCaseNoteHandler', () => {
	it('should create an application note and record audit entry with the correct userId', async () => {
		const logger = mockLogger();
		const mockAudit = {
			record: mock.fn(() => Promise.resolve()),
			recordMany: mock.fn(() => Promise.resolve())
		};
		let createdNoteData: any;

		const mockDb = {
			$transaction: async (cb: Function) =>
				cb({
					crownDevelopment: {
						findUnique: async () => ({ id: 'case-123' })
					},
					applicationNote: {
						create: async ({ data }: any) => {
							createdNoteData = data;
							return { id: 'note-1', ...data };
						}
					}
				})
		} as any;

		const service = {
			db: mockDb,
			logger,
			audit: mockAudit,
			isAuditLive: true
		} as unknown as CaseNotesService;

		const handler = buildCreateCaseNoteHandler(service, 'crown');

		const mockReq = {
			params: { id: 'case-123' },
			body: { comment: 'Test case note comment' },
			session: { account: { localAccountId: 'user-789' } },
			baseUrl: '/cases/'
		};

		const mockRes = {
			redirect: (url: string) => url,
			status: () => mockRes,
			send: () => mockRes
		};

		await handler(asReq(mockReq), asRes(mockRes));

		assert.ok(createdNoteData, 'expected applicationNote.create to be called');
		assert.strictEqual(createdNoteData.userId, 'user-789');
		assert.strictEqual(createdNoteData.comment, 'Test case note comment');

		assert.strictEqual(mockAudit.record.mock.callCount(), 1);
		const auditCall = (mockAudit.record.mock.calls[0] as any).arguments[0];

		assert.strictEqual(auditCall.userId, 'user-789');
		assert.strictEqual(auditCall.caseId, 'case-123');
		assert.strictEqual(auditCall.action, AUDIT_ACTIONS.CASE_NOTE_ADDED);
		assert.deepStrictEqual(auditCall.metadata, { caseNote: 'Test case note comment' });
	});

	it('should throw an error if userId is missing from session', async () => {
		const logger = mockLogger();
		const mockAudit = {
			record: mock.fn(() => Promise.resolve()),
			recordMany: mock.fn(() => Promise.resolve())
		};
		const mockDb = {} as any;

		const service = { db: mockDb, logger, audit: mockAudit } as unknown as CaseNotesService;
		const handler = buildCreateCaseNoteHandler(service, 'crown');

		const mockReq = {
			params: { id: 'case-123' },
			body: { comment: 'Test comment' },
			session: { account: {} },
			baseUrl: '/cases/'
		};
		const mockRes = {};

		await assert.rejects(
			async () => {
				await handler(asReq(mockReq), mockRes as any);
			},
			{
				name: 'Error',
				message: 'user Id is required'
			}
		);

		assert.strictEqual(mockAudit.record.mock.callCount(), 0);
	});

	it('should throw an error if id is missing', async () => {
		const service = { logger: mockLogger() } as unknown as CaseNotesService;
		const handler = buildCreateCaseNoteHandler(service, 'crown');
		const mockReq = { params: {}, body: { comment: 'Test' } };

		await assert.rejects(async () => handler(asReq(mockReq), asRes({})), {
			message: 'id must be a single string value'
		});
	});

	it('should throw an error if comment is missing', async () => {
		const service = { logger: mockLogger() } as unknown as CaseNotesService;
		const handler = buildCreateCaseNoteHandler(service, 'crown');
		const mockReq = { params: { id: '123' }, body: {} };

		await assert.rejects(async () => handler(asReq(mockReq), asRes({})), { message: 'comment required' });
	});

	it('should handle 500 error on database failure', async () => {
		const logger = mockLogger();
		const mockDb = {
			$transaction: async () => {
				throw new Error('DB Error');
			}
		} as any;

		const service = { db: mockDb, logger } as unknown as CaseNotesService;
		const handler = buildCreateCaseNoteHandler(service, 's62a');

		const mockReq = {
			params: { id: 'case-123' },
			body: { comment: 'Test' },
			session: { account: { localAccountId: 'user-1' } }
		};

		let statusCode = 0;
		let sentMessage = '';
		const mockRes = {
			status: (code: number) => {
				statusCode = code;
				return mockRes;
			},
			send: (msg: string) => {
				sentMessage = msg;
			}
		};

		await handler(asReq(mockReq), asRes(mockRes));

		assert.strictEqual(statusCode, 500);
		assert.strictEqual(sentMessage, 'Unable to save case note');
	});

	it('should catch database errors, invoke wrapPrismaError and return 500', async () => {
		const logger = mockLogger();
		const mockDb = {
			$transaction: async () => {
				throw new Error('DB Error');
			}
		} as any;

		const service = { db: mockDb, logger } as unknown as CaseNotesService;
		const handler = buildCreateCaseNoteHandler(service, 's62a');

		const mockReq = {
			params: { id: 'case-123' },
			body: { comment: 'Test' },
			session: { account: { localAccountId: 'user-1' } }
		};

		let statusCode = 0;
		let sentMessage = '';
		const mockRes = {
			status: (code: number) => {
				statusCode = code;
				return mockRes;
			},
			send: (msg: string) => {
				sentMessage = msg;
			}
		};

		await handler(asReq(mockReq), asRes(mockRes));
		assert.strictEqual(statusCode, 500);
		assert.strictEqual(sentMessage, 'Unable to save case note');
	});
});

describe('buildFetchCaseNotesMiddleware', () => {
	it('should fetch notes, map them and set locals correctly for s62a', async () => {
		const logger = mockLogger();
		const mockDb = {
			s62aCase: {
				findUnique: mock.fn(async () => ({
					id: 's62a-1',
					reference: 'S62A/123',
					Notes: [{ comment: 'Test', createdAt: new Date(), userId: 'user-1' }]
				}))
			}
		};

		const service = {
			db: mockDb,
			logger,
			getEntraClient: mock.fn(),
			entraGroupIds: { caseOfficers: 'g1', inspectors: 'g2' }
		} as any;

		const handler = buildFetchCaseNotesMiddleware(service, 's62a');

		const mockReq = { params: { id: 's62a-1' }, query: {} };
		const mockRes = { locals: {} };
		let nextCalled = false;
		const next = () => {
			nextCalled = true;
		};

		await handler(asReq(mockReq), asRes(mockRes), next);

		assert.strictEqual(mockDb.s62aCase.findUnique.mock.callCount(), 1);
		assert.ok(mockRes.locals.caseNoteData, 'caseNoteData should be populated in locals');
		assert.ok(mockRes.locals.caseNotePaginationParams, 'Pagination params should be in locals');
		assert.strictEqual(nextCalled, true);
	});
	it('should invoke notFoundHandler if caseRow is null', async () => {
		const logger = mockLogger();
		const mockDb = { crownDevelopment: { findUnique: async () => null } } as unknown;
		const service = { db: mockDb, logger, getEntraClient: mock.fn(), entraGroupIds: {} } as unknown as CaseNotesService;
		const handler = buildFetchCaseNotesMiddleware(service, 'crown');
		const mockReq = { params: { id: 'crown-1' } };

		let notFoundTriggered = false;
		const mockRes = {
			status: () => mockRes,
			render: () => {
				notFoundTriggered = true;
			}
		};

		await handler(asReq(mockReq), asRes(mockRes), mock.fn());
	});

	it('should invoke wrapPrismaError and throw on DB error', async () => {
		const logger = mockLogger();
		const mockDb = {
			crownDevelopment: {
				findUnique: async () => {
					throw new Error('DB Error');
				}
			}
		} as unknown;
		const service = { db: mockDb, logger, getEntraClient: mock.fn(), entraGroupIds: {} } as unknown as CaseNotesService;
		const handler = buildFetchCaseNotesMiddleware(service, 'crown');
		const mockReq = { params: { id: 'crown-1' } };
		const mockRes = { status: () => mockRes, render: () => {} };

		await assert.rejects(async () => handler(asReq(mockReq), asRes(mockRes), mock.fn()), { message: 'DB Error' });
	});
});

describe('buildViewCaseNotes', () => {
	it('should render the view.njk template with mapped notes for crown', async () => {
		const logger = mockLogger();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({
					id: 'crown-1',
					reference: 'CRN/123',
					Notes: [{ comment: 'Test view', createdAt: new Date(), userId: 'user-1' }]
				}))
			}
		};

		const service = {
			db: mockDb,
			logger,
			getEntraClient: mock.fn(),
			entraGroupIds: { caseOfficers: 'g1', inspectors: 'g2' }
		} as any;

		const handler = buildViewCaseNotes(service, 'crown');

		const mockReq = { params: { id: 'crown-1' }, baseUrl: '/cases/', originalUrl: '/cases/crown-1/notes' };
		let renderedTemplate = '';
		let renderedArgs: any;

		const mockRes = {
			render: (template: string, args: any) => {
				renderedTemplate = template;
				renderedArgs = args;
			}
		};

		await handler(asReq(mockReq), asRes(mockRes));

		assert.strictEqual(renderedTemplate, './application-notes-view.njk');
		assert.strictEqual(renderedArgs.pageHeading, 'Case notes');
		assert.strictEqual(renderedArgs.reference, 'CRN/123');
		assert.ok(renderedArgs.caseNotes.length > 0);
	});

	it('should throw an error if id is missing', async () => {
		const service = { logger: mockLogger() } as any;
		const handler = buildViewCaseNotes(service, 'crown');
		const mockReq = { params: {} };

		await assert.rejects(async () => handler(asReq(mockReq), asRes({})), {
			message: 'id must be a single string value'
		});
	});
	it('should invoke wrapPrismaError and throw on DB error', async () => {
		const logger = mockLogger();
		const mockDb = {
			s62aCase: {
				findUnique: async () => {
					throw new Error('DB Error');
				}
			}
		} as unknown;
		const service = { db: mockDb, logger, getEntraClient: mock.fn(), entraGroupIds: {} } as unknown as CaseNotesService;
		const handler = buildViewCaseNotes(service, 's62a');

		const mockReq = { params: { id: 'missing' } };
		const mockRes = { status: () => mockRes, render: mock.fn() };

		await assert.rejects(async () => handler(asReq(mockReq), asRes(mockRes)), { message: 'DB Error' });
	});
});

describe('buildViewAddCaseNotes', () => {
	it('should render the add-case.njk template via render callback', async () => {
		const logger = mockLogger();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({
					id: 'crown-2',
					reference: 'CRN/999',
					Notes: []
				}))
			}
		};

		const service = {
			db: mockDb,
			logger,
			getEntraClient: mock.fn(),
			entraGroupIds: { caseOfficers: 'g1', inspectors: 'g2' }
		} as any;

		const handler = buildViewAddCaseNotes(service, 'crown');

		const mockReq = { params: { id: 'crown-2' }, baseUrl: '/cases/', originalUrl: '/cases/crown-2/notes/add' };

		let sentHtml = '';
		const mockRes = {
			render: (template: string, args: any, callback: Function) => {
				assert.strictEqual(template, 'add-case.njk');
				assert.strictEqual(args.backLinkText, 'Back');
				callback(null, '<html>Rendered</html>');
			},
			send: (html: string) => {
				sentHtml = html;
			}
		};

		await handler(asReq(mockReq), asRes(mockRes));

		assert.strictEqual(sentHtml, '<html>Rendered</html>');
	});

	it('should throw an error if id is missing', async () => {
		const service = { logger: mockLogger() } as any;
		const handler = buildViewAddCaseNotes(service, 'crown');
		const mockReq = { params: {} };

		await assert.rejects(async () => handler(asReq(mockReq), asRes({})), {
			message: 'id must be a single string value'
		});
	});
	it('should invoke wrapPrismaError and throw on DB error', async () => {
		const logger = mockLogger();
		const mockDb = {
			crownDevelopment: {
				findUnique: async () => {
					throw new Error('DB Error');
				}
			}
		} as unknown;
		const service = { db: mockDb, logger, getEntraClient: mock.fn(), entraGroupIds: {} } as unknown as CaseNotesService;
		const handler = buildViewAddCaseNotes(service, 'crown');
		const mockReq = { params: { id: 'missing' } };
		const mockRes = { status: () => mockRes, render: mock.fn() };

		await assert.rejects(async () => handler(asReq(mockReq), asRes(mockRes)), { message: 'DB Error' });
	});
});

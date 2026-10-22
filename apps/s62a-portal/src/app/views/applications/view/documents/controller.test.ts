import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildApplicationDocumentsPage, buildDownloadDocument } from './controller.ts';
import type { Request, Response, NextFunction } from 'express';
import type { DocumentDownloader } from './document-downloader.ts';

describe('Documents Controller', () => {
	let mockService: any;
	let mockReq: Partial<Request>;
	let mockRes: any;
	let mockNext: NextFunction;

	const validUuid = '123e4567-e89b-12d3-a456-426614174000';

	beforeEach(() => {
		const mockCase = {
			id: validUuid,
			reference: 'CASE-001',
			representationsPeriodStartDate: new Date(),
			representationsPeriodEndDate: new Date(),
			representationsPublishDate: new Date()
		};

		mockService = {
			db: {
				s62aCase: {
					findUnique: mock.fn(async () => mockCase),
					findFirst: mock.fn(async () => mockCase)
				},
				document: {
					count: mock.fn(async () => 10),
					groupBy: mock.fn(async () => [{ categoryId: 'cat-1', _count: { categoryId: 5 } }])
				}
			},
			logger: {
				error: mock.fn(),
				warn: mock.fn(),
				info: mock.fn()
			}
		};

		mockReq = {
			params: { applicationId: validUuid, documentId: validUuid },
			query: {},
			baseUrl: '/base',
			originalUrl: '/base/documents'
		};

		mockRes = {
			render: mock.fn(),
			status: mock.fn(() => mockRes),
			send: mock.fn(),
			headersSent: false
		};

		mockNext = mock.fn();
	});

	describe('buildApplicationDocumentsPage', () => {
		it('should exit early and not render if the applicationId is not a valid UUID', async () => {
			mockReq.params!.applicationId = 'invalid-id';
			const handler = buildApplicationDocumentsPage(mockService);

			await handler(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
		});

		it('should render the documents view with default parameters when no query filters are applied', async () => {
			const handler = buildApplicationDocumentsPage(mockService);

			await handler(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(mockService.db.document.count.mock.calls.length, 1);

			const countWhere = mockService.db.document.count.mock.calls[0].arguments[0].where;
			assert.strictEqual(countWhere.s62aCaseId, validUuid);
			assert.strictEqual(countWhere.deletedAt, null);
			assert.ok(countWhere.publishDate.lte instanceof Date);
			assert.strictEqual(countWhere.AND, undefined);
			assert.strictEqual(countWhere.categoryId, undefined);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const renderContext = mockRes.render.mock.calls[0].arguments[1];

			assert.strictEqual(renderContext.id, validUuid);
			assert.strictEqual(renderContext.pageTitle, 'Documents');
			assert.strictEqual(renderContext.applicationReference, 'CASE-001');
		});

		it('should apply search, date, and category filters to the database query when query parameters are present', async () => {
			mockReq.query = {
				searchCriteria: 'site plan',
				'publishedDateFrom-day': '01',
				'publishedDateFrom-month': '05',
				'publishedDateFrom-year': '2024',
				'publishedDateTo-day': '31',
				'publishedDateTo-month': '12',
				'publishedDateTo-year': '2024',
				filterCategory: ['cat-1', 'cat-2']
			};

			const handler = buildApplicationDocumentsPage(mockService);
			await handler(mockReq as Request, mockRes as Response, mockNext);

			const countCallArgs = mockService.db.document.count.mock.calls[0].arguments[0];
			const where = countCallArgs.where;

			assert.strictEqual(where.s62aCaseId, validUuid);

			assert.deepStrictEqual(where.categoryId, { in: ['cat-1', 'cat-2'] });

			assert.ok(where.publishDate.gte instanceof Date);
			assert.ok(where.publishDate.lte instanceof Date);

			assert.ok(Array.isArray(where.AND));
			const searchClause = where.AND[0];
			assert.ok(searchClause.AND?.length !== 0);
		});

		it('should normalise a single category string into an array for the DB query', async () => {
			mockReq.query = { filterCategory: 'cat-1' };

			const handler = buildApplicationDocumentsPage(mockService);
			await handler(mockReq as Request, mockRes as Response, mockNext);

			const where = mockService.db.document.count.mock.calls[0].arguments[0].where;
			assert.deepStrictEqual(where.categoryId, { in: ['cat-1'] });
		});
	});

	describe('buildDownloadDocument', () => {
		let mockDownloader: any;

		beforeEach(() => {
			mockDownloader = {
				processDownload: mock.fn(async () => {})
			};
		});

		it('should call processDownload on the downloader successfully', async () => {
			const handler = buildDownloadDocument(mockService, mockDownloader as DocumentDownloader);

			await handler(mockReq as Request, mockRes as Response);

			assert.strictEqual(mockDownloader.processDownload.mock.calls.length, 1);
			assert.strictEqual(mockDownloader.processDownload.mock.calls[0].arguments[0], mockReq);
			assert.strictEqual(mockDownloader.processDownload.mock.calls[0].arguments[1], mockRes);
		});

		it('should catch errors, log them, and send a 500 status if headers have not been sent', async () => {
			mockDownloader.processDownload.mock.mockImplementationOnce(() => {
				throw new Error('Download failed');
			});

			const handler = buildDownloadDocument(mockService, mockDownloader as DocumentDownloader);
			await handler(mockReq as Request, mockRes as Response);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 500);
			assert.strictEqual(mockRes.send.mock.calls[0].arguments[0], 'Internal Server Error');
		});

		it('should catch errors and log them, but NOT send 500 if headers have already been sent', async () => {
			mockRes.headersSent = true;
			mockDownloader.processDownload.mock.mockImplementationOnce(() => {
				throw new Error('Stream interrupted');
			});

			const handler = buildDownloadDocument(mockService, mockDownloader as DocumentDownloader);
			await handler(mockReq as Request, mockRes as Response);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.status.mock.calls.length, 0);
			assert.strictEqual(mockRes.send.mock.calls.length, 0);
		});
	});
});

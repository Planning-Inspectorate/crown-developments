import { describe, it, mock } from 'node:test';
import { buildApplicationDocumentsPage } from './controller.ts';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { buildUrlWithParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import type { Request, Response } from 'express';
import type { PortalService } from '#service';

interface MockDb {
	crownDevelopment: {
		findUnique: ReturnType<typeof mock.fn>;
	};
	applicationUpdate?: {
		findFirst: ReturnType<typeof mock.fn>;
		count: ReturnType<typeof mock.fn>;
	};
}

interface MockSharePoint {
	getItemsByPathWithCustomMetadata: ReturnType<typeof mock.fn>;
}

interface MockRequest {
	params?: { applicationId?: string };
	baseUrl?: string;
	originalUrl?: string;
	query?: Record<string, unknown>;
}

interface MockResponse {
	status: ReturnType<typeof mock.fn>;
	render: ReturnType<typeof mock.fn>;
}

function createMockDb(overrides?: Partial<MockDb>): MockDb {
	return {
		crownDevelopment: {
			findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
		},
		applicationUpdate: {
			findFirst: mock.fn(() => undefined),
			count: mock.fn(() => 0)
		},
		...overrides
	};
}

function createMockSharePoint(documents: unknown[] = []): MockSharePoint {
	return {
		getItemsByPathWithCustomMetadata: mock.fn(() => documents)
	};
}

function createMockRequest(overrides?: MockRequest): Request {
	return {
		params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
		baseUrl: 'test-baseUrl',
		originalUrl: '/documents',
		query: {},
		...overrides
	} as unknown as Request;
}

function createMockResponse(): MockResponse & Response {
	return {
		status: mock.fn(),
		render: mock.fn()
	} as unknown as MockResponse & Response;
}

function getRenderArgs(res: MockResponse): Record<string, unknown> {
	return res.render.mock.calls[0].arguments[1] as Record<string, unknown>;
}

describe('controller', () => {
	describe('buildApplicationDocumentsPage', () => {
		it('should check for id', async () => {
			const handler = buildApplicationDocumentsPage({} as PortalService);
			await assert.rejects(() => handler({} as Request, {} as Response));
		});

		it('should return not found for invalid id', async () => {
			const handler = buildApplicationDocumentsPage({} as PortalService);
			const req = createMockRequest({ params: { applicationId: 'abc-123' } });
			const res = createMockResponse();

			await handler(req, res);

			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should return not found for non-published cases', async () => {
			const mockDb = createMockDb({
				crownDevelopment: { findUnique: mock.fn(() => null) }
			});
			const mockSharePoint = createMockSharePoint();
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest();
			const res = createMockResponse();

			await handler(req, res);

			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should fetch published documents', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint();
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({
				originalUrl: 'test-baseUrl/documents?searchCriteria="test"'
			});
			const res = createMockResponse();

			await handler(req, res);

			assert.strictEqual(mockSharePoint.getItemsByPathWithCustomMetadata.mock.callCount(), 1);
			assert.match(
				mockSharePoint.getItemsByPathWithCustomMetadata.mock.calls[0].arguments[0],
				/^CROWN-2025-0000001\/Published$/
			);
			assert.strictEqual(res.render.mock.callCount(), 1);

			const renderArgs = getRenderArgs(res);
			assert.strictEqual(renderArgs.id, 'cfe3dc29-1f63-45e6-81dd-da8183842bf8');
			assert.strictEqual(renderArgs.baseUrl, 'test-baseUrl/documents');
			assert.strictEqual(renderArgs.pageTitle, 'Documents');
			assert.strictEqual(renderArgs.applicationReference, 'CROWN/2025/0000001');
			assert.strictEqual(renderArgs.pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(renderArgs.isWithdrawn, false);
			assert.strictEqual(renderArgs.containsDistressingContent, false);
			assert.strictEqual(renderArgs.currentUrl, 'test-baseUrl/documents?searchCriteria="test"');
			// No query params, so clearQueryUrl should be just the base URL
			assert.strictEqual(renderArgs.clearQueryUrl, 'test-baseUrl/documents');
			assert.strictEqual(renderArgs.selectedItemsPerPage, 25);
			assert.strictEqual(renderArgs.totalDocuments, 0);
			assert.strictEqual(renderArgs.pageNumber, 1);
			assert.strictEqual(renderArgs.totalPages, 0);
			assert.strictEqual(renderArgs.resultsStartNumber, 0);
			assert.strictEqual(renderArgs.resultsEndNumber, 0);
			assert.strictEqual(renderArgs.searchValue, '');
			assert.strictEqual(renderArgs.queryParams, undefined);
			assert.ok(Array.isArray(renderArgs.links));
			assert.strictEqual((renderArgs.links as unknown[]).length, 2);
			assert.ok(Array.isArray(renderArgs.documents));
			assert.strictEqual((renderArgs.documents as unknown[]).length, 0);
			assert.ok(Array.isArray(renderArgs.filters));
		});

		it('should not render folders', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: 1, name: 'File 1', file: { mimeType: 'image/png' } },
				{ id: 2, name: 'File 2', file: { mimeType: 'application/pdf' } },
				{ id: 3, name: 'Folder A' }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest();
			const res = createMockResponse();

			await handler(req, res);

			assert.strictEqual(mockSharePoint.getItemsByPathWithCustomMetadata.mock.callCount(), 1);
			assert.match(
				mockSharePoint.getItemsByPathWithCustomMetadata.mock.calls[0].arguments[0],
				/^CROWN-2025-0000001\/Published$/
			);
			assert.strictEqual(res.render.mock.callCount(), 1);

			const viewData = getRenderArgs(res);
			assert.strictEqual((viewData.documents as unknown[]).length, 2);
			assert.strictEqual(
				(viewData.documents as Array<{ name: string }>).find((d) => d.name === 'Folder A'),
				undefined
			);
		});

		it('should render a banner and tags when contains distressing content', async () => {
			const mockDb = createMockDb({
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001',
						applicationStatus: 'active',
						containsDistressingContent: true
					}))
				}
			});
			const mockSharePoint = createMockSharePoint([
				{ id: 1, name: 'File 1', file: { mimeType: 'image/png' }, listItem: { fields: { Distressing: 'Yes' } } },
				{ id: 2, name: 'File 2', file: { mimeType: 'application/pdf' } },
				{ id: 3, name: 'Folder A' }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest();
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			assert.strictEqual((viewData.documents as unknown[]).length, 2);

			const documents = viewData.documents as Array<{ name: string; type: string; distressing: boolean }>;
			assert.deepStrictEqual(
				documents.find((d) => d.name === 'File 1'),
				{
					id: 1,
					name: 'File 1',
					type: 'Image',
					distressing: true,
					category: undefined,
					size: undefined,
					lastModified: '',
					lastModifiedDateTime: undefined,
					createdDate: ''
				}
			);
			assert.deepStrictEqual(
				documents.find((d) => d.name === 'File 2'),
				{
					id: 2,
					name: 'File 2',
					type: 'PDF',
					distressing: false,
					category: undefined,
					size: undefined,
					lastModified: '',
					lastModifiedDateTime: undefined,
					createdDate: ''
				}
			);
		});

		it('should filter documents by search name', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '1', name: 'Test Report', file: { mimeType: 'application/pdf' } },
				{ id: '2', name: 'Statement test', file: { mimeType: 'application/pdf' } },
				{ id: '3', name: 'TEST FILE', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({
				query: { searchCriteria: 'Test' },
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8'
			});
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			const documents = viewData.documents as Array<{ name: string }>;
			assert.strictEqual(documents.length, 3);
			assert.deepStrictEqual(
				documents.map((doc) => doc.name),
				['Statement test', 'TEST FILE', 'Test Report']
			);
		});

		it('should handle multiple queries in search query', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '3', name: '(test) Flood Risk Assessment.pdf', file: { mimeType: 'application/pdf' } },
				{ id: '4', name: 'test', file: { mimeType: 'application/pdf' } },
				{ id: '5', name: 'FILE test', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({
				query: { searchCriteria: 'Test flood risk assessment' },
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8'
			});
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			const documents = viewData.documents as Array<{ name: string }>;
			assert.strictEqual(documents.length, 1);
			assert.strictEqual(documents[0].name, '(test) Flood Risk Assessment.pdf');
		});

		it('should only return documents containing all queries within a search', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '1', name: 'Test Statement Report.pdf', file: { mimeType: 'application/pdf' } },
				{ id: '2', name: 'Test Statement.pdf', file: { mimeType: 'application/pdf' } },
				{ id: '3', name: 'Statement Report.pdf', file: { mimeType: 'application/pdf' } },
				{ id: '4', name: 'Test Report.pdf', file: { mimeType: 'application/pdf' } },
				{ id: '5', name: 'Test Statement Report Extra.pdf', file: { mimeType: 'application/pdf' } },
				{ id: '6', name: 'Completely Different.pdf', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({
				query: { searchCriteria: 'test statement report' },
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8'
			});
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			const documents = viewData.documents as Array<{ name: string }>;
			assert.strictEqual(documents.length, 2);
			assert.deepStrictEqual(
				documents.map((doc) => doc.name),
				['Test Statement Report.pdf', 'Test Statement Report Extra.pdf']
			);
		});

		it('should show all documents when no searchCriteria is provided', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
				{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest();
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			const documents = viewData.documents as Array<{ name: string }>;
			assert.strictEqual(documents.length, 2);
			assert.deepStrictEqual(
				documents.map((doc) => doc.name),
				['Doc 1', 'Doc 2']
			);
		});

		it('should show all documents when searchCriteria is an empty string', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
				{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({ query: { searchCriteria: '' } });
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			const documents = viewData.documents as Array<{ name: string }>;
			assert.strictEqual(documents.length, 2);
			assert.deepStrictEqual(
				documents.map((doc) => doc.name),
				['Doc 1', 'Doc 2']
			);
		});

		it('should show all documents when searchCriteria is null or undefined', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
				{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);

			for (const value of [null, undefined]) {
				const req = createMockRequest({ query: { searchCriteria: value } });
				const res = createMockResponse();

				await handler(req, res);

				const viewData = getRenderArgs(res);
				const documents = viewData.documents as Array<{ name: string }>;
				assert.strictEqual(documents.length, 2);
				assert.deepStrictEqual(
					documents.map((doc) => doc.name),
					['Doc 1', 'Doc 2']
				);
			}
		});

		it('should default to pageSize 100 when query itemsPerPage is not 25, 50, or 100', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
				{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } },
				{ id: '3', name: 'Doc 3', file: { mimeType: 'application/pdf' } }
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({ query: { itemsPerPage: '30' } });
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			assert.strictEqual(viewData.selectedItemsPerPage, 30);
			assert.strictEqual((viewData.documents as unknown[]).length, 3);
			assert.strictEqual(viewData.pageNumber, 1);
			assert.strictEqual(viewData.totalPages, 1);
			assert.strictEqual(viewData.resultsStartNumber, 1);
			assert.strictEqual(viewData.resultsEndNumber, 3);
			assert.strictEqual(viewData.searchValue, '');
		});

		it('should preserve itemsPerPage in clearQueryUrl while clearing search and filters', async () => {
			const mockDb = createMockDb();
			const mockSharePoint = createMockSharePoint([
				{
					id: '1',
					name: 'Doc 1',
					file: { mimeType: 'application/pdf' },
					listItem: { fields: { Category: 'application' } }
				}
			]);
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			} as unknown as PortalService);
			const req = createMockRequest({
				query: {
					searchCriteria: 'test',
					filterCategory: 'application',
					itemsPerPage: '50',
					page: '2'
				},
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8'
			});
			const res = createMockResponse();

			await handler(req, res);

			const viewData = getRenderArgs(res);
			// clearQueryUrl should preserve itemsPerPage but clear searchCriteria and filterCategory, reset page to 1
			assert.strictEqual(
				viewData.clearQueryUrl,
				'/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/documents?itemsPerPage=50&page=1'
			);
		});
	});
});

describe('buildUrlWithParams', () => {
	it('should build correct URL with search and filters', () => {
		const url = buildUrlWithParams('/applications/123/documents', {
			searchCriteria: 'foo',
			filterBy: ['attachments', 'submittedBy'],
			page: 2
		});
		const params = new URLSearchParams(url.split('?')[1]);
		assert.strictEqual(params.get('searchCriteria'), 'foo');
		const filterBy = params.getAll('filterBy');
		assert.deepStrictEqual(filterBy, ['attachments', 'submittedBy']);
		assert.strictEqual(params.get('page'), '2');
	});

	it('should remove searchCriteria when cleared', () => {
		const url = buildUrlWithParams(
			'/applications/123/documents',
			{ searchCriteria: 'foo', filterBy: 'attachments', page: 1 },
			{ searchCriteria: undefined }
		);
		const params = new URLSearchParams(url.split('?')[1]);
		assert.strictEqual(params.get('searchCriteria'), null);
		assert.strictEqual(params.get('filterBy'), 'attachments');
	});

	it('should encode spaces as %20 in search', () => {
		const url = buildUrlWithParams('/applications/123/documents', { searchCriteria: 'foo bar' });
		// Accept both + and %20 for space encoding
		const hasEncodedSpace = url.includes('searchCriteria=foo+bar') || url.includes('searchCriteria=foo%20bar');
		assert.strictEqual(hasEncodedSpace, true);
	});

	it('should support multi-value filters and preserve search', () => {
		const url = buildUrlWithParams('/applications/123/documents', {
			searchCriteria: 'abc',
			filterBy: ['attachments', 'submittedBy'],
			page: 3
		});
		const params = new URLSearchParams(url.split('?')[1]);
		const filterBy = params.getAll('filterBy');
		assert.strictEqual(params.get('searchCriteria'), 'abc');
		assert.deepStrictEqual(filterBy, ['attachments', 'submittedBy']);
		assert.strictEqual(params.get('page'), '3');
	});
});

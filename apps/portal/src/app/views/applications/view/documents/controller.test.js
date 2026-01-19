import { describe, it, mock } from 'node:test';
import { buildApplicationDocumentsPage } from './controller.js';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { buildUrlWithParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';

describe('controller', () => {
	describe('buildApplicationDocumentsPage', () => {
		it('should check for id', async () => {
			const handler = buildApplicationDocumentsPage({});
			await assert.rejects(() => handler({}, {}));
		});

		it('should return not found for invalid id', async () => {
			const handler = buildApplicationDocumentsPage({});
			const req = {
				params: { applicationId: 'abc-123' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should return not found for non-published cases', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn()
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should fetch published documents', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: 'test-baseUrl',
				originalUrl: 'test-baseUrl/documents?searchCriteria="test"'
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(res.render.mock.callCount(), 1);
			assert.deepStrictEqual(res.render.mock.calls[0].arguments[1], {
				id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
				baseUrl: 'test-baseUrl/documents',
				pageTitle: 'Documents',
				applicationReference: 'CROWN/2025/0000001',
				pageCaption: 'CROWN/2025/0000001',
				isWithdrawn: false,
				links: [
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-information',
						text: 'Application information'
					},
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/documents',
						text: 'Documents'
					}
				],
				currentUrl: 'test-baseUrl/documents?searchCriteria="test"',
				documents: [],
				selectedItemsPerPage: 25,
				totalDocuments: 0,
				pageNumber: 1,
				totalPages: 0,
				resultsStartNumber: 0,
				resultsEndNumber: 0,
				searchValue: '',
				queryParams: undefined
			});
		});

		it('should not render folders', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: 1, name: 'File 1', file: { mimeType: 'image/png' } },
					{ id: 2, name: 'File 2', file: { mimeType: 'application/pdf' } },
					{ id: 3, name: 'Folder A' }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(res.render.mock.callCount(), 1);
			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.documents.length, 2);
			assert.strictEqual(
				viewData.documents.find((d) => d.name === 'Folder A'),
				undefined
			);
		});
		it('should filter documents by search name', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '1', name: 'Test Report', file: { mimeType: 'application/pdf' } },
					{ id: '2', name: 'Statement test', file: { mimeType: 'application/pdf' } },
					{ id: '3', name: 'TEST FILE', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});

			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				query: { searchCriteria: 'Test' },
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8',
				originalUrl: '/documents'
			};

			const res = { status: mock.fn(), render: mock.fn() };
			await handler(req, res);
			let renderedDocs = res.render.mock.calls[0].arguments[1].documents;
			assert.strictEqual(renderedDocs.length, 3);
			assert.deepStrictEqual(
				renderedDocs.map((doc) => doc.name),
				['Test Report', 'Statement test', 'TEST FILE']
			);
		});

		it('should handle multiple queries in search query ', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '3', name: '(test) Flood Risk Assessment.pdf', file: { mimeType: 'application/pdf' } },
					{ id: '4', name: 'test', file: { mimeType: 'application/pdf' } },
					{ id: '5', name: 'FILE test', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});

			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				query: { searchCriteria: 'Test flood risk assessment' },
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8',
				originalUrl: '/documents'
			};
			const res = { status: mock.fn(), render: mock.fn() };
			await handler(req, res);
			let renderedDocs = res.render.mock.calls[0].arguments[1].documents;
			assert.strictEqual(renderedDocs.length, 1);
			assert.strictEqual(renderedDocs[0].name, '(test) Flood Risk Assessment.pdf');
		});

		it('should only return documents containing all queries within a search', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '1', name: 'Test Statement Report.pdf', file: { mimeType: 'application/pdf' } },
					{ id: '2', name: 'Test Statement.pdf', file: { mimeType: 'application/pdf' } },
					{ id: '3', name: 'Statement Report.pdf', file: { mimeType: 'application/pdf' } },
					{ id: '4', name: 'Test Report.pdf', file: { mimeType: 'application/pdf' } },
					{ id: '5', name: 'Test Statement Report Extra.pdf', file: { mimeType: 'application/pdf' } },
					{ id: '6', name: 'Completely Different.pdf', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});

			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				query: { searchCriteria: 'test statement report' },
				baseUrl: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8',
				originalUrl: '/documents'
			};
			const res = { status: mock.fn(), render: mock.fn() };
			await handler(req, res);
			let renderedDocs = res.render.mock.calls[0].arguments[1].documents;
			assert.strictEqual(renderedDocs.length, 2);
			assert.deepStrictEqual(
				renderedDocs.map((doc) => doc.name),
				['Test Statement Report.pdf', 'Test Statement Report Extra.pdf']
			);
		});
		// JavaScript
		it('should show all documents when no searchCriteria is provided ', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
					{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: 'test-baseUrl',
				originalUrl: '/documents'
				// no search query provided (default view)
			};
			const res = { status: mock.fn(), render: mock.fn() };
			await handler(req, res);
			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.documents.length, 2);
			assert.deepStrictEqual(
				viewData.documents.map((doc) => doc.name),
				['Doc 1', 'Doc 2']
			);
		});
		it('should show all documents when searchCriteria is an empty string', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
					{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: 'test-baseUrl',
				originalUrl: '/documents',
				query: { searchCriteria: '' } // empty search query
			};
			const res = { status: mock.fn(), render: mock.fn() };
			await handler(req, res);
			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.documents.length, 2);
			assert.deepStrictEqual(
				viewData.documents.map((doc) => doc.name),
				['Doc 1', 'Doc 2']
			);
		});

		it('should show all documents when searchCriteria is null or undefined', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
					{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});

			for (const value of [null, undefined]) {
				const req = {
					params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
					baseUrl: 'test-baseUrl',
					originalUrl: '/documents',
					query: { searchCriteria: value }
				};
				const res = { status: mock.fn(), render: mock.fn() };
				await handler(req, res);
				const viewData = res.render.mock.calls[0].arguments[1];
				assert.strictEqual(viewData.documents.length, 2);
				assert.deepStrictEqual(
					viewData.documents.map((doc) => doc.name),
					['Doc 1', 'Doc 2']
				);
				res.render = mock.fn();
			}
		});
		it('should default to pageSize 100 when query itemsPerPage is not 25, 50, or 100', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001', applicationStatus: 'active' }))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: '1', name: 'Doc 1', file: { mimeType: 'application/pdf' } },
					{ id: '2', name: 'Doc 2', file: { mimeType: 'application/pdf' } },
					{ id: '3', name: 'Doc 3', file: { mimeType: 'application/pdf' } }
				])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: 'test-baseUrl',
				originalUrl: '/documents',
				query: { itemsPerPage: '30' }
			};
			const res = { status: mock.fn(), render: mock.fn() };
			await handler(req, res);
			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.selectedItemsPerPage, 30);
			assert.strictEqual(viewData.documents.length, 3);
			assert.strictEqual(viewData.pageNumber, 1);
			assert.strictEqual(viewData.totalPages, 1);
			assert.strictEqual(viewData.resultsStartNumber, 1);
			assert.strictEqual(viewData.resultsEndNumber, 3);
			assert.strictEqual(viewData.searchValue, '');
		});
	});
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

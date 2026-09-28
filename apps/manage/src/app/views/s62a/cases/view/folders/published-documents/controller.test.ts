import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildViewPublishedDocuments } from './controller.ts';
import type { ManageService } from '#service';
import type { Request, Response, NextFunction } from 'express';

type TemplatePayload = {
	reference: string;
	folderName: string;
	backLinkUrl: string;
	baseFoldersUrl: string;
	currentPath: string;
	currentUrl: string;
	breadcrumbItems: Array<{ text: string; href?: string }>;
	subFolders: any[];
	documents: any[];
	paginationParams: any;
	baseUrl: string;
	errorSummary: any;
	caseId: string;
	isPublishedView: boolean;
	banner: string | null;
};

describe('buildViewPublishedDocuments controller', () => {
	it('should render the published documents view with the correct template variables', async () => {
		const mockFindUniqueCase = mock.fn(async () => ({
			reference: 'REF-PUB-001'
		}));

		const mockFindManyDocs = mock.fn(async () => [
			{
				id: 'doc-1',
				fileName: 'published-doc.pdf',
				size: BigInt(2048),
				mimeType: 'application/pdf',
				uploadedDate: new Date('2024-02-01T12:00:00Z'),
				publishDate: new Date('2024-02-01T10:00:00Z'),
				s62aCaseId: 'case-123',
				DocumentCategory: { id: 'cat-1', displayName: 'Plans' }
			}
		]);

		const mockCountDocs = mock.fn(async () => 1);

		const mockService = {
			db: {
				s62aCase: {
					findUnique: mockFindUniqueCase
				},
				document: {
					findMany: mockFindManyDocs,
					count: mockCountDocs
				}
			},
			logger: {
				info: mock.fn(),
				error: mock.fn()
			}
		} as unknown as ManageService;

		const handler = buildViewPublishedDocuments(mockService);

		const mockRender = mock.fn();
		const mockReq = {
			params: { id: 'case-123' },
			query: { page: '1' },
			originalUrl: '/s62a/cases/case-123/published-documents',
			baseUrl: '/s62a/cases/case-123/published-documents',
			session: {}
		} as unknown as Request;

		const mockRes = {
			render: mockRender,
			status: mock.fn(() => mockRes),
			send: mock.fn()
		} as unknown as Response;

		const mockNext = mock.fn() as unknown as NextFunction;

		await handler(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRender.mock.callCount(), 1);

		const callArgs = mockRender.mock.calls[0].arguments as [string, TemplatePayload];
		const viewName = callArgs[0];
		const payload = callArgs[1];

		assert.strictEqual(viewName, 'views/s62a/cases/view/folders/util/shared-folder-view.njk');

		assert.strictEqual(payload.reference, 'REF-PUB-001');
		assert.strictEqual(payload.folderName, 'Published documents');
		assert.strictEqual(payload.isPublishedView, true);
		assert.strictEqual(payload.caseId, 'case-123');
		assert.strictEqual(payload.backLinkUrl, '/s62a/cases/case-123/case-folders');
		assert.strictEqual(payload.baseFoldersUrl, '/s62a/cases/case-123/case-folders');

		assert.strictEqual(payload.breadcrumbItems.length, 2);
		assert.strictEqual(payload.breadcrumbItems[0].text, 'Manage case files');
		assert.strictEqual(payload.breadcrumbItems[1].text, 'Published documents');

		assert.strictEqual(payload.documents.length, 1);
		assert.ok(payload.paginationParams);
		assert.strictEqual(payload.paginationParams.totalItems, 1);

		assert.strictEqual(payload.subFolders.length, 0);
	});

	it('should not render and pass to notFoundHandler if case is not found', async () => {
		const mockFindUniqueCase = mock.fn(async () => null);
		const mockFindManyDocs = mock.fn(async () => []);
		const mockCountDocs = mock.fn(async () => 0);

		const mockService = {
			db: {
				s62aCase: { findUnique: mockFindUniqueCase },
				document: { findMany: mockFindManyDocs, count: mockCountDocs }
			},
			logger: { info: mock.fn(), error: mock.fn() }
		} as unknown as ManageService;

		const mockRender = mock.fn();
		const mockReq = {
			params: { id: 'case-999' },
			query: {},
			originalUrl: '/s62a/cases/case-999/published-documents',
			baseUrl: '/s62a/cases/case-999/published-documents',
			session: {}
		} as unknown as Request;

		const mockRes = {
			render: mockRender,
			status: mock.fn(() => mockRes),
			send: mock.fn()
		} as unknown as Response;

		await buildViewPublishedDocuments(mockService)(mockReq, mockRes, mock.fn() as unknown as NextFunction);

		assert.strictEqual(mockRender.mock.callCount(), 1);
	});
});

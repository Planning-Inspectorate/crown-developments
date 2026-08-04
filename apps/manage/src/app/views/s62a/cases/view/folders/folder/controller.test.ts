import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildViewCaseFolder } from './controller.ts';
import type { ManageService } from '../../../../../../service.js';
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
};

describe('buildViewCaseFolder controller', () => {
	it('should render the folder view with the correct template variables, including documents and pagination', async () => {
		const mockFindUnique = mock.fn(async () => ({
			id: 'folder-456',
			displayName: 'Original versions',
			s62aCaseId: 'case-123',
			S62aCase: { reference: 'REF-001' },
			ChildFolders: [{ id: 'child-1', displayName: 'Consultees', displayOrder: 1 }],
			ParentFolder: { id: 'parent-789', displayName: 'Representations' }
		}));

		const mockFindManyFolders = mock.fn(async () => [
			{ id: 'parent-789', displayName: 'Representations', parentFolderId: null },
			{ id: 'folder-456', displayName: 'Original versions', parentFolderId: 'parent-789' }
		]);

		const mockFindManyDocs = mock.fn(async () => [
			{
				id: 'doc-1',
				fileName: 'test-doc.pdf',
				size: BigInt(1024),
				mimeType: 'application/pdf',
				uploadedDate: new Date('2024-01-01T12:00:00Z'),
				s62aCaseId: 'case-123',
				Folder: { id: 'folder-456', displayName: 'Original versions' }
			}
		]);

		const mockCountDocs = mock.fn(async () => 1);

		const mockService = {
			db: {
				folder: {
					findUnique: mockFindUnique,
					findMany: mockFindManyFolders
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

		const handler = buildViewCaseFolder(mockService);

		const mockRender = mock.fn();
		const mockReq = {
			params: { id: 'case-123', folderId: 'folder-456' },
			query: { page: '1' },
			originalUrl: '/s62a/cases/case-123/case-folders/folder-456?tab=1',
			baseUrl: '/s62a/cases/case-123/case-folders/folder-456'
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

		assert.strictEqual(viewName, 'views/s62a/cases/view/folders/folder/view.njk');
		assert.strictEqual(payload.reference, 'REF-001');
		assert.strictEqual(payload.folderName, 'Original versions');
		assert.strictEqual(payload.backLinkUrl, '/s62a/cases/case-123/case-folders/parent-789/representations');
		assert.strictEqual(payload.currentPath, '/s62a/cases/case-123/case-folders/folder-456');
		assert.strictEqual(payload.baseUrl, '/s62a/cases/case-123/case-folders/folder-456');

		assert.strictEqual(payload.breadcrumbItems.length, 3);
		assert.strictEqual(payload.breadcrumbItems[2].text, 'Original versions');

		assert.strictEqual(payload.subFolders.length, 1);
		assert.strictEqual(payload.subFolders[0].id, 'child-1');

		assert.strictEqual(payload.documents.length, 1);
		assert.strictEqual(payload.documents[0].fileName, 'test-doc.pdf');

		assert.ok(payload.paginationParams);
		assert.strictEqual(payload.paginationParams.totalItems, 1);
	});

	it('should set backLinkUrl to the base folder page when the folder is at the root', async () => {
		const mockFindUnique = mock.fn(async () => ({
			id: 'folder-456',
			displayName: 'Root Folder',
			s62aCaseId: 'case-123',
			S62aCase: { reference: 'REF-001' },
			ChildFolders: [],
			ParentFolder: null
		}));

		const mockFindManyFolders = mock.fn(async () => [
			{ id: 'folder-456', displayName: 'Root Folder', parentFolderId: null }
		]);
		const mockFindManyDocs = mock.fn(async () => []);
		const mockCountDocs = mock.fn(async () => 0);

		const mockService = {
			db: {
				folder: {
					findUnique: mockFindUnique,
					findMany: mockFindManyFolders
				},
				document: {
					findMany: mockFindManyDocs,
					count: mockCountDocs
				}
			},
			logger: { info: mock.fn(), error: mock.fn() }
		} as unknown as ManageService;

		const mockRender = mock.fn();
		const mockReq = {
			params: { id: 'case-123', folderId: 'folder-456' },
			query: {},
			originalUrl: '/s62a/cases/case-123/case-folders/folder-456',
			baseUrl: '/s62a/cases/case-123/case-folders/folder-456'
		} as unknown as Request;
		const mockRes = { render: mockRender, status: mock.fn(), send: mock.fn() } as unknown as Response;

		await buildViewCaseFolder(mockService)(mockReq, mockRes, mock.fn() as unknown as NextFunction);

		const callArgs = mockRender.mock.calls[0].arguments as [string, TemplatePayload];
		const payload = callArgs[1];

		assert.strictEqual(payload.backLinkUrl, '/s62a/cases/case-123/case-folders');
	});
});

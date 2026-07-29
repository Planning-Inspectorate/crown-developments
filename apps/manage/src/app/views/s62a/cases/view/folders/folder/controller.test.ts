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
	breadcrumbItems: Array<{ text: string; href?: string }>;
};

describe('buildViewCaseFolder controller', () => {
	it('should render the folder view with the correct template variables', async () => {
		const mockFindUnique = mock.fn(async () => ({
			id: 'folder-456',
			displayName: 'Original versions',
			s62aCaseId: 'case-123',
			S62aCase: { reference: 'REF-001' },
			ChildFolders: [{ id: 'child-1', displayName: 'Consultees', displayOrder: 1 }],
			ParentFolder: { id: 'parent-789', displayName: 'Representations' }
		}));

		const mockFindMany = mock.fn(async () => [
			{ id: 'parent-789', displayName: 'Representations', parentFolderId: null },
			{ id: 'folder-456', displayName: 'Original versions', parentFolderId: 'parent-789' }
		]);

		const mockService = {
			db: {
				folder: {
					findUnique: mockFindUnique,
					findMany: mockFindMany
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
			originalUrl: '/s62a/cases/case-123/case-folders/folder-456?tab=1'
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

		assert.strictEqual(payload.breadcrumbItems.length, 3);
		assert.strictEqual(payload.breadcrumbItems[2].text, 'Original versions');
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

		const mockFindMany = mock.fn(async () => [{ id: 'folder-456', displayName: 'Root Folder', parentFolderId: null }]);

		const mockService = {
			db: {
				folder: {
					findUnique: mockFindUnique,
					findMany: mockFindMany
				}
			},
			logger: { info: mock.fn(), error: mock.fn() }
		} as unknown as ManageService;

		const mockRender = mock.fn();
		const mockReq = {
			params: { id: 'case-123', folderId: 'folder-456' },
			originalUrl: '/s62a/cases/case-123/case-folders/folder-456'
		} as unknown as Request;
		const mockRes = { render: mockRender, status: mock.fn(), send: mock.fn() } as unknown as Response;

		await buildViewCaseFolder(mockService)(mockReq, mockRes, mock.fn() as unknown as NextFunction);

		const callArgs = mockRender.mock.calls[0].arguments as [string, TemplatePayload];
		const payload = callArgs[1];

		assert.strictEqual(payload.backLinkUrl, '/s62a/cases/case-123/case-folders');
	});
});

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildUploadToFolderView } from './controller.ts';
import type { ManageService } from '../../../../../../../service.js';
import type { Request, Response } from 'express';

function setupMocks() {
	const mockFindUnique = mock.fn(async (): Promise<any> => null);

	const db = {
		folder: {
			findUnique: mockFindUnique
		}
	};

	const logger = {
		error: mock.fn(),
		info: mock.fn(),
		warn: mock.fn()
	};

	const service = { db, logger } as unknown as ManageService;

	const mockErrors = [{ text: 'File too large', href: '#main' }];

	const req = {
		params: { id: 'case-1', folderId: 'folder-1' },
		sessionID: 'session-123',
		baseUrl: '/cases/case-1/folders/folder-1/upload',
		originalUrl: '/cases/case-1/folders/folder-1/upload?query=1',
		session: {
			'case-1': {
				files: { uploadErrors: mockErrors },
				uploadErrors: mockErrors
			},
			files: {
				'case-1': { uploadErrors: mockErrors },
				uploadErrors: mockErrors
			},
			uploadErrors: mockErrors
		}
	} as unknown as Request;

	const res = {
		render: mock.fn(),
		status: mock.fn(() => res),
		json: mock.fn(),
		send: mock.fn()
	} as any;

	return { service, req, res, mocks: { mockFindUnique }, mockErrors };
}

describe('buildUploadToFolderView', () => {
	it('renders the view with folder data, drafts, and passes session errors', async () => {
		const { service, req, res, mocks, mockErrors } = setupMocks();

		mocks.mockFindUnique.mock.mockImplementation(async () => ({
			id: 'folder-1',
			displayName: 'My Folder',
			S62aCase: { reference: 'REF-123' },
			DraftDocuments: [{ id: 'draft-1', fileName: 'test.pdf', size: BigInt(500) }]
		}));

		const handler = buildUploadToFolderView(service);
		await handler(req, res, () => {});

		assert.strictEqual(res.render.mock.calls.length, 1);
		const [viewPath, viewData] = res.render.mock.calls[0].arguments;

		assert.strictEqual(viewPath, 'views/s62a/cases/view/folders/folder/upload/view.njk');
		assert.strictEqual(viewData.pageHeading, 'REF-123');
		assert.strictEqual(viewData.backLinkUrl, '/cases/case-1/folders/folder-1');
		assert.strictEqual(viewData.folder.displayName, 'My Folder');
		assert.strictEqual(viewData.folder.id, 'folder-1');
		assert.deepStrictEqual(viewData.errorSummary, mockErrors);
	});

	it('defers to notFoundHandler if the folder does not exist in the database', async () => {
		const { service, req, res, mocks } = setupMocks();

		mocks.mockFindUnique.mock.mockImplementation(async () => null);

		const handler = buildUploadToFolderView(service);
		await handler(req, res, () => {});

		assert.strictEqual(res.render.mock.calls.length, 1);
	});
});

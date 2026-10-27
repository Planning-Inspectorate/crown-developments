import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { buildRenameFolder, buildRenameFolderView, renameFolderRecord } from './controller.ts';

describe('Rename Folder Controller', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockDb: any;
	let mockService: any;

	beforeEach(() => {
		mockReq = {
			baseUrl: '/cases/123/case-folders/456/rename-folder',
			params: { id: 'case-123', folderId: 'folder-456' },
			body: {},
			session: { folders: {} }
		};

		mockRes = {
			render: mock.fn(),
			redirect: mock.fn(),
			status: mock.fn(function (this: any) {
				return this;
			}),
			send: mock.fn()
		};

		mockNext = mock.fn();

		mockDb = {
			folder: {
				findUnique: mock.fn(),
				update: mock.fn()
			}
		};

		mockService = {
			db: mockDb,
			logger: { error: mock.fn() },
			audit: {
				record: mock.fn(() => Promise.resolve())
			}
		};
	});

	describe('buildRenameFolderView', () => {
		it('should render the view if data is valid', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					displayName: 'Current Name'
				})
			);

			const handler = buildRenameFolderView(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const [view, data] = mockRes.render.mock.calls[0].arguments;
			assert.strictEqual(view, 'views/s62a/cases/view/folders/folder/rename-folder/view.njk');
			assert.strictEqual(data.currentFolderName, 'Current Name');
		});

		it('should render 404 if folder not found', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			const handler = buildRenameFolderView(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
	});

	describe('buildRenameFolder', () => {
		it('should rename and redirect on success', async () => {
			mockReq.body.folderName = 'New Name';
			mockDb.folder.update.mock.mockImplementation(() => Promise.resolve({}));

			const handler = buildRenameFolder(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockDb.folder.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.folder.update.mock.calls[0].arguments[0].data.displayName, 'New Name');

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/123/case-folders/456');
		});

		it('should throw error if folderId is missing', async () => {
			mockReq.params.folderId = undefined;
			const handler = buildRenameFolder(mockService);

			await assert.rejects(async () => {
				await handler(mockReq, mockRes, mockNext);
			});
		});

		it('should throw error if DB update fails', async () => {
			mockReq.body.folderName = 'New Name';
			mockDb.folder.update.mock.mockImplementation(() => Promise.reject(new Error('DB Error')));

			const handler = buildRenameFolder(mockService);

			await assert.rejects(async () => {
				await handler(mockReq, mockRes, mockNext);
			});
		});
		it('should store true when renaming succeeds', async () => {
			mockReq.body.folderName = 'New Name';
			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve({ displayName: 'Old Name' }));
			mockDb.folder.update.mock.mockImplementation(() => Promise.resolve({}));

			const handler = buildRenameFolder(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockDb.folder.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockDb.folder.update.mock.calls[0].arguments[0].data.displayName, 'New Name');

			assert.deepStrictEqual(mockReq.session.folder['folder-456'].renamed, true);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/123/case-folders/456');
		});
	});

	describe('renameFolderRecord', () => {
		it('should pass correct data to prisma', async () => {
			mockDb.folder.update.mock.mockImplementation(() => Promise.resolve());

			await renameFolderRecord(mockDb, { name: 'Foo', folderId: '123' });

			assert.strictEqual(mockDb.folder.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.folder.update.mock.calls[0].arguments[0].where.id, '123');
		});
	});
});

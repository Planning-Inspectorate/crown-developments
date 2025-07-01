import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	deleteRepresentationAttachmentsFolder,
	getRepresentationFolder,
	moveAttachmentsToCaseFolder
} from './handle-attachments.js';
import { mockLogger } from '../testing/mock-logger.js';

describe('handleAttachments', () => {
	describe('getRepresentationFolder', () => {
		it('should retrieve or create the representation folder', async () => {
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => ({ id: 'folder-id' })),
				addNewFolder: mock.fn(() => ({ id: 'sub-folder-id' }))
			};
			const folderPath = 'path/to/folder';
			const representationReference = 'rep-ref';

			const result = await getRepresentationFolder(mockSharePointDrive, folderPath, representationReference);
			assert.strictEqual(result.id, 'sub-folder-id');
		});
		it('should throw an error if the folder cannot be created or retrieved', async () => {
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(),
				addNewFolder: mock.fn(() => {
					throw { statusCode: 500 };
				})
			};
			const folderPath = 'path/to/folder';
			const representationReference = 'rep-ref';

			await assert.rejects(getRepresentationFolder(mockSharePointDrive, folderPath, representationReference), {
				message: `Representation folder not found for reference: ${representationReference}`
			});
		});
		it('should handle if the subfolder already exists', async () => {
			let callCount = 0;

			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => (callCount++ ? { id: 'sub-folder-id' } : { id: 'folder-id' })),
				addNewFolder: async () => {
					throw { statusCode: 409 };
				}
			};
			const folderPath = 'path/to/folder';
			const representationReference = 'rep-ref';
			const result = await getRepresentationFolder(mockSharePointDrive, folderPath, representationReference);
			assert.strictEqual(result.id, 'sub-folder-id');
		});
		it('should throw an error if the subfolder cannot be created or retrieved', async () => {
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => ({ id: 'folder-id' })),
				addNewFolder: mock.fn(() => {
					throw { statusCode: 500 };
				})
			};
			const folderPath = 'path/to/folder';
			const representationReference = 'rep-ref';

			await assert.rejects(getRepresentationFolder(mockSharePointDrive, folderPath, representationReference), {
				message: `Failed to create SharePoint folder: ${representationReference} folder`
			});
		});
		it('should throw an error if the subfolder already exists but does not return an id', async () => {
			let callCount = 0;

			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => {
					if (callCount++ === 1) {
						return {};
					}
					return { id: 'folder-id' };
				}),
				addNewFolder: async () => {
					throw { statusCode: 409 };
				}
			};
			const folderPath = 'path/to/folder';
			const representationReference = 'rep-ref';
			await assert.rejects(getRepresentationFolder(mockSharePointDrive, folderPath, representationReference), {
				message: `Representation subfolder not found for reference: ${representationReference}`
			});
		});
	});
	describe('moveAttachmentsToCaseFolder', () => {
		it('should move attachments to the specified subfolder', async () => {
			const mockSharePointDrive = {
				moveItemsToFolder: mock.fn(() => Promise.resolve([]))
			};
			const mockService = {
				logger: mockLogger(),
				sharePointDrive: mockSharePointDrive
			};
			const mockRepresentationAttachmentsFolderPath = mock.fn(() => 'path/to/attachments');
			const mockGetRepresentationFolder = mock.fn(() => ({ id: 'sub-folder-id' }));
			const representationReference = 'rep-ref';
			const applicationReference = 'application-reference';
			const representationAttachments = [
				{
					itemId: 'item1',
					fileName: 'attachment1.txt'
				},
				{
					itemId: 'item2',
					fileName: 'attachment2.txt'
				}
			];

			await moveAttachmentsToCaseFolder(
				{
					service: mockService,
					applicationReference,
					representationReference,
					representationAttachments
				},
				mockRepresentationAttachmentsFolderPath,
				mockGetRepresentationFolder
			);
			assert.strictEqual(mockSharePointDrive.moveItemsToFolder.mock.calls.length, 1);
			assert.deepStrictEqual(
				mockSharePointDrive.moveItemsToFolder.mock.calls[0].arguments[0],
				representationAttachments.map((item) => item.itemId)
			);
			assert.strictEqual(
				mockSharePointDrive.moveItemsToFolder.mock.calls[0].arguments[1],
				mockGetRepresentationFolder().id
			);
		});
		it('should throw an error if moving attachments fails', async () => {
			const mockSharePointDrive = {
				moveItemsToFolder: mock.fn(() => Promise.reject(new Error('Move failed')))
			};
			const mockService = {
				logger: mockLogger(),
				sharePointDrive: mockSharePointDrive
			};
			const mockRepresentationAttachmentsFolderPath = mock.fn(() => 'path/to/attachments');
			const mockGetRepresentationFolder = mock.fn(() => ({ id: 'sub-folder-id' }));
			const representationReference = 'rep-ref';
			const applicationReference = 'application-reference';
			const representationAttachments = [
				{
					itemId: 'item1',
					fileName: 'attachment1.txt'
				},
				{
					itemId: 'item2',
					fileName: 'attachment2.txt'
				}
			];
			await assert.rejects(
				async () => {
					await moveAttachmentsToCaseFolder(
						{
							service: mockService,
							applicationReference,
							representationReference,
							representationAttachments
						},
						mockRepresentationAttachmentsFolderPath,
						mockGetRepresentationFolder
					);
				},
				(e) => e.message === 'Failed to move representation attachments: Move failed'
			);
		});
	});
	describe('deleteRepresentationAttachmentsFolder', () => {
		it('should delete the representation attachments folder', async () => {
			const mockReq = {
				session: {},
				sessionId: 'sub-folder-id'
			};
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => {
					return { id: 'folder-id' };
				}),
				deleteItemsRecursivelyById: mock.fn()
			};
			const mockRepresentationSessionFolderPathFn = mock.fn(() => `${applicationReference}/${representationReference}`);
			const mockService = {
				logger: mockLogger(),
				sharePointDrive: mockSharePointDrive
			};
			const applicationReference = 'application-reference';
			const representationReference = 'rep-ref';

			await deleteRepresentationAttachmentsFolder(
				{
					service: mockService,
					applicationReference,
					representationReference,
					appName: 'manage'
				},
				mockReq,
				{},
				mockRepresentationSessionFolderPathFn
			);
			assert.strictEqual(mockSharePointDrive.deleteItemsRecursivelyById.mock.calls.length, 1);
			assert.strictEqual(mockSharePointDrive.deleteItemsRecursivelyById.mock.calls[0].arguments[0], 'folder-id');
		});
		it('should handle if the folder does not exist', async () => {
			const mockReq = {
				session: {},
				sessionId: 'sub-folder-id'
			};
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => Promise.reject({ statusCode: 404 })),
				deleteItemsRecursivelyById: mock.fn()
			};
			const mockRepresentationSessionFolderPathFn = mock.fn(() => `${applicationReference}/${representationReference}`);
			const mockService = {
				logger: mockLogger(),
				sharePointDrive: mockSharePointDrive
			};
			const applicationReference = 'application-reference';
			const representationReference = 'rep-ref';

			await deleteRepresentationAttachmentsFolder(
				{
					service: mockService,
					applicationReference,
					representationReference,
					appName: 'manage'
				},
				mockReq,
				{},
				mockRepresentationSessionFolderPathFn
			);
			assert.strictEqual(mockSharePointDrive.deleteItemsRecursivelyById.mock.calls.length, 0);
		});
		it('should handle if it doesnt return an id', async () => {
			const mockReq = {
				session: {},
				sessionId: 'sub-folder-id'
			};
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => {
					return { otherId: 'folder-id' };
				}),
				deleteItemsRecursivelyById: mock.fn()
			};
			const mockRepresentationSessionFolderPathFn = mock.fn(() => `${applicationReference}/${representationReference}`);
			const mockService = {
				logger: mockLogger(),
				sharePointDrive: mockSharePointDrive
			};
			const applicationReference = 'application-reference';
			const representationReference = 'rep-ref';

			await deleteRepresentationAttachmentsFolder(
				{
					service: mockService,
					applicationReference,
					representationReference,
					appName: 'manage'
				},
				mockReq,
				{},
				mockRepresentationSessionFolderPathFn
			);
			assert.strictEqual(mockSharePointDrive.deleteItemsRecursivelyById.mock.calls.length, 0);
		});
		it('should throw an error if deleting the folder fails', async () => {
			const mockReq = {
				session: {},
				sessionId: 'sub-folder-id'
			};
			const mockSharePointDrive = {
				getDriveItemByPath: mock.fn(() => ({ id: 'folder-id' })),
				deleteItemsRecursivelyById: mock.fn(() => {
					throw new Error('Delete failed');
				})
			};
			const mockRepresentationSessionFolderPathFn = mock.fn(() => `${applicationReference}/${representationReference}`);
			const mockService = {
				logger: mockLogger(),
				sharePointDrive: mockSharePointDrive
			};
			const applicationReference = 'application-reference';
			const representationReference = 'rep-ref';

			await assert.rejects(
				async () => {
					await deleteRepresentationAttachmentsFolder(
						{
							service: mockService,
							applicationReference,
							representationReference,
							appName: 'manage'
						},
						mockReq,
						{},
						mockRepresentationSessionFolderPathFn
					);
				},
				(e) => e.message === `Failed to delete representation attachments: Delete failed`
			);
		});
	});
});

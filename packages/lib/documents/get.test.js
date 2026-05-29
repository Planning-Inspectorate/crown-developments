import { describe, it, mock } from 'node:test';
import { mockLogger } from '../testing/mock-logger.js';
import assert from 'node:assert';
import { getDocuments, getDocumentsById } from './get.js';

describe('get', () => {
	describe('getDocuments', () => {
		it('should fetch raw DriveItems', async () => {
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [{ id: 1, name: 'File 1', file: { mimeType: 'image/png' } }])
			};
			const driveItems = await getDocuments({
				id: 'id-1',
				logger: mockLogger(),
				folderPath: 'CROWN-2025-0000001/Published',
				sharePointDrive: mockSharePoint
			});
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(driveItems.length, 1);
			assert.deepStrictEqual(driveItems[0], {
				id: 1,
				name: 'File 1',
				file: { mimeType: 'image/png' }
			});
		});

		it('should return all items including folders', async () => {
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: 1, name: 'File 1', file: { mimeType: 'image/png' } },
					{ id: 2, name: 'File 2', file: { mimeType: 'application/pdf' } },
					{ id: 3, name: 'Folder A' }
				])
			};
			const driveItems = await getDocuments({
				id: 'id-1',
				logger: mockLogger(),
				folderPath: 'CROWN-2025-0000001/Published',
				sharePointDrive: mockSharePoint
			});
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(driveItems.length, 3);
		});

		it('should not throw sharepoint errors', async () => {
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => {
					throw new Error('SharePoint error');
				})
			};
			await assert.rejects(
				() =>
					getDocuments({
						id: 'id-1',
						logger: mockLogger(),
						folderPath: 'CROWN-2025-0000001/Published',
						sharePointDrive: mockSharePoint
					}),
				{
					message: 'There is a problem fetching documents'
				}
			);
		});
	});

	describe('getDocumentsById', () => {
		it('should fetch raw DriveItems by ids', async () => {
			const mockSharePoint = {
				getDriveItem: mock.fn((id) => ({ id, name: `File ${id}`, file: { mimeType: 'application/pdf' } }))
			};
			const driveItems = await getDocumentsById({
				ids: [1, 2],
				logger: mockLogger(),
				folderPath: 'CROWN-2025-0000001/Published',
				sharePointDrive: mockSharePoint
			});
			assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 2);
			assert.deepStrictEqual(
				driveItems.map((d) => d.name),
				['File 1', 'File 2']
			);
		});

		it('should return all items including invalid ones', async () => {
			const mockSharePoint = {
				getDriveItem: mock.fn((id) =>
					id === 1 ? { id, name: 'File 1', file: { mimeType: 'application/pdf' } } : { id, name: null, file: null }
				)
			};
			const driveItems = await getDocumentsById({
				ids: [1, 2],
				logger: mockLogger(),
				folderPath: 'CROWN-2025-0000001/Published',
				sharePointDrive: mockSharePoint
			});
			assert.strictEqual(driveItems.length, 2);
		});

		it('should not throw sharepoint errors', async () => {
			const mockSharePoint = {
				getDriveItem: mock.fn(() => {
					throw new Error('SharePoint error');
				})
			};
			await assert.rejects(
				() =>
					getDocumentsById({
						ids: [1],
						logger: mockLogger(),
						folderPath: 'CROWN-2025-0000001/Published',
						sharePointDrive: mockSharePoint
					}),
				{
					message: 'There is a problem fetching documents'
				}
			);
		});
	});
});

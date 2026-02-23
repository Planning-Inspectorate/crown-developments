import { describe, it, mock } from 'node:test';
import { mockLogger } from '../testing/mock-logger.js';
import assert from 'node:assert';
import { getDocuments, getDocumentsById } from './get.js';

describe('get', () => {
	describe('getDocuments', () => {
		it('should fetch and map documents', async () => {
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [{ id: 1, name: 'File 1', file: { mimeType: 'image/png' } }])
			};
			const documents = await getDocuments({
				id: 'id-1',
				logger: mockLogger(),
				folderPath: 'CROWN-2025-0000001/Published',
				sharePointDrive: mockSharePoint
			});
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(documents.length, 1);
			assert.deepStrictEqual(documents[0], {
				id: 1,
				name: 'File 1',
				type: 'Image',
				lastModified: '',
				size: undefined,
				distressing: false
			});
		});

		it('should not render folders', async () => {
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [
					{ id: 1, name: 'File 1', file: { mimeType: 'image/png' } },
					{ id: 2, name: 'File 2', file: { mimeType: 'application/pdf' } },
					{ id: 3, name: 'Folder A' }
				])
			};
			const documents = await getDocuments({
				id: 'id-1',
				logger: mockLogger(),
				folderPath: 'CROWN-2025-0000001/Published',
				sharePointDrive: mockSharePoint
			});
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(documents.length, 2);
			assert.strictEqual(
				documents.find((d) => d.name === 'Folder A'),
				undefined
			);
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
});
describe('getDocumentsById', () => {
	it('should fetch and map documents by ids', async () => {
		const mockSharePoint = {
			getDriveItem: mock.fn((id) => ({ id, name: `File ${id}`, file: { mimeType: 'application/pdf' } }))
		};
		const documents = await getDocumentsById({
			ids: [1, 2],
			logger: mockLogger(),
			folderPath: 'CROWN-2025-0000001/Published',
			sharePointDrive: mockSharePoint
		});
		assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 2);
		assert.deepStrictEqual(
			documents.map((d) => d.name),
			['File 1', 'File 2']
		);
	});

	it('should filter out invalid or null mappings', async () => {
		const mockSharePoint = {
			getDriveItem: mock.fn(
				(id) =>
					id === 1 ? { id, name: 'File 1', file: { mimeType: 'application/pdf' } } : { id, name: null, file: null } // check returns null
			)
		};
		const documents = await getDocumentsById({
			ids: [1, 2],
			logger: mockLogger(),
			folderPath: 'CROWN-2025-0000001/Published',
			sharePointDrive: mockSharePoint
		});
		assert.strictEqual(documents.length, 1);
		assert.strictEqual(documents[0].name, 'File 1');
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

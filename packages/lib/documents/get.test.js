import { describe, it, mock } from 'node:test';
import { mockLogger } from '../testing/mock-logger.js';
import assert from 'node:assert';
import { getDocuments } from './get.js';

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
				size: undefined
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

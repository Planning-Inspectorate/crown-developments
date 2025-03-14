import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapDriveItemToViewModel } from './view-model.js';

describe('view-model', () => {
	describe('mapDriveItemToViewModel', () => {
		it('should map all fields', () => {
			const driveItem = {
				id: 'abc-123',
				name: 'Document 1',
				size: 2048,
				lastModifiedDateTime: '2025-02-13T16:56:00Z',
				file: { mimeType: 'application/pdf' }
			};
			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), {
				id: 'abc-123',
				name: 'Document 1',
				size: '2 KB',
				lastModified: '13 Feb 2025',
				type: 'PDF'
			});
		});
		it('should ignore size if not present', () => {
			const driveItem = {
				id: 'abc-123',
				name: 'Document 1',
				lastModifiedDateTime: '2025-02-13T16:56:00Z',
				file: { mimeType: 'application/pdf' }
			};
			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), {
				id: 'abc-123',
				name: 'Document 1',
				size: undefined,
				lastModified: '13 Feb 2025',
				type: 'PDF'
			});
		});
		it('should return undefined for folders', () => {
			const driveItem = {
				id: 'abc-123',
				name: 'Document 1',
				lastModifiedDateTime: '2025-02-13T16:56:00Z'
			};
			assert.strictEqual(mapDriveItemToViewModel(driveItem), undefined);
		});
	});
});

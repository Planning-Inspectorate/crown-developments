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
				type: 'PDF',
				distressing: false
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
				type: 'PDF',
				distressing: false
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
		it('should flag distressing contents from listItem fields if distressing is yes', () => {
			const driveItem = {
				id: 'abc-123',
				name: 'Document 1',
				size: 2048,
				lastModifiedDateTime: '2025-02-13T16:56:00Z',
				file: { mimeType: 'application/pdf' },
				listItem: {
					fields: {
						Distressing: 'Yes'
					}
				}
			};
			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), {
				id: 'abc-123',
				name: 'Document 1',
				size: '2 KB',
				lastModified: '13 Feb 2025',
				type: 'PDF',
				distressing: true
			});
		});
		it('should not flag distressing contents from listItem fields if distressing is no', () => {
			const driveItem = {
				id: 'abc-123',
				name: 'Document 1',
				size: 2048,
				lastModifiedDateTime: '2025-02-13T16:56:00Z',
				file: { mimeType: 'application/pdf' },
				listItem: {
					fields: {
						Distressing: 'No'
					}
				}
			};
			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), {
				id: 'abc-123',
				name: 'Document 1',
				size: '2 KB',
				lastModified: '13 Feb 2025',
				type: 'PDF',
				distressing: false
			});
		});
		it('should not flag distressing contents from listItem fields if distressing is undefined', () => {
			const driveItem = {
				id: 'abc-123',
				name: 'Document 1',
				size: 2048,
				lastModifiedDateTime: '2025-02-13T16:56:00Z',
				file: { mimeType: 'application/pdf' },
				listItem: {
					fields: {
						distressing: undefined
					}
				}
			};
			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), {
				id: 'abc-123',
				name: 'Document 1',
				size: '2 KB',
				lastModified: '13 Feb 2025',
				type: 'PDF',
				distressing: false
			});
		});
	});
});

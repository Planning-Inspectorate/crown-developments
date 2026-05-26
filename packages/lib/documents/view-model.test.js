import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapDriveItemToViewModel } from './view-model.js';

// Helper functions to create test data
function createBaseDriveItem(overrides = {}) {
	return {
		id: 'abc-123',
		name: 'Document 1',
		size: 2048,
		lastModifiedDateTime: '2025-02-13T16:56:00Z',
		createdDateTime: '2025-02-14T16:56:00Z',
		file: { mimeType: 'application/pdf' },
		...overrides
	};
}

function createExpectedViewModel(overrides = {}) {
	return {
		id: 'abc-123',
		name: 'Document 1',
		size: '2 KB',
		createdDate: '14 Feb 2025',
		createdDateTime: '2025-02-14T16:56:00Z',
		lastModified: '13 Feb 2025',
		lastModifiedDateTime: '2025-02-13T16:56:00Z',
		type: 'PDF',
		distressing: false,
		category: undefined,
		...overrides
	};
}

describe('view-model', () => {
	describe('mapDriveItemToViewModel', () => {
		it('should map all fields', () => {
			const driveItem = createBaseDriveItem({ createdDateTime: '2025-02-14T16:56:00Z' });
			const expected = createExpectedViewModel({
				createdDate: '14 Feb 2025',
				createdDateTime: '2025-02-14T16:56:00Z'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should ignore size if not present', () => {
			const driveItem = createBaseDriveItem({ size: undefined, createdDateTime: '2025-02-14T16:56:00Z' });
			const expected = createExpectedViewModel({
				size: undefined,
				createdDate: '14 Feb 2025',
				createdDateTime: '2025-02-14T16:56:00Z'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
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
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-14T16:56:00Z',
				listItem: { fields: { Distressing: 'Yes' } }
			});
			const expected = createExpectedViewModel({
				distressing: true,
				createdDate: '14 Feb 2025',
				createdDateTime: '2025-02-14T16:56:00Z'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should not flag distressing contents from listItem fields if distressing is no', () => {
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-14T16:56:00Z',
				listItem: { fields: { Distressing: 'No' } }
			});
			const expected = createExpectedViewModel({
				createdDate: '14 Feb 2025',
				createdDateTime: '2025-02-14T16:56:00Z'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should not flag distressing contents from listItem fields if distressing is undefined', () => {
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-14T16:56:00Z',
				listItem: { fields: { distressing: undefined } }
			});
			const expected = createExpectedViewModel({
				createdDate: '14 Feb 2025',
				createdDateTime: '2025-02-14T16:56:00Z'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should map category from SharePoint to camelCase value', () => {
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-13T16:56:00Z',
				listItem: { fields: { Category: 'Application' } }
			});
			const expected = createExpectedViewModel({
				createdDate: '13 Feb 2025',
				createdDateTime: '2025-02-13T16:56:00Z',
				category: 'application'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should map LPA Questionnaire category correctly', () => {
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-13T16:56:00Z',
				listItem: { fields: { Category: 'LPA Questionnaire' } }
			});
			const expected = createExpectedViewModel({
				createdDate: '13 Feb 2025',
				createdDateTime: '2025-02-13T16:56:00Z',
				category: 'lpaQuestionnaire'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should map Written Representations category correctly', () => {
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-13T16:56:00Z',
				listItem: { fields: { Category: 'Written Representations' } }
			});
			const expected = createExpectedViewModel({
				createdDate: '13 Feb 2025',
				createdDateTime: '2025-02-13T16:56:00Z',
				category: 'writtenRepresentations'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});

		it('should return undefined for unknown category values', () => {
			const driveItem = createBaseDriveItem({
				createdDateTime: '2025-02-13T16:56:00Z',
				listItem: { fields: { Category: 'Unknown Category' } }
			});
			const expected = createExpectedViewModel({
				createdDate: '13 Feb 2025',
				createdDateTime: '2025-02-13T16:56:00Z'
			});

			assert.deepStrictEqual(mapDriveItemToViewModel(driveItem), expected);
		});
	});
});

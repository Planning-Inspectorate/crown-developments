import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { S62AFolder } from '@pins/crowndev-database/src/client/client.ts';
import { createFoldersViewModel } from './view-model.ts';

describe('view-model', () => {
	describe('createFoldersViewModel', () => {
		it('should return an empty array when given no folders', () => {
			const result = createFoldersViewModel([]);
			assert.deepStrictEqual(result, []);
		});

		it('should sort folders by displayOrder in ascending order and append encodedDisplayName', () => {
			const mockFolders = [
				{ id: 'folder-b', displayName: 'second-folder', displayOrder: 20 },
				{ id: 'folder-a', displayName: 'first-folder', displayOrder: 10 },
				{ id: 'folder-c', displayName: 'third-folder', displayOrder: 30 }
			] as unknown as S62AFolder[];

			const result = createFoldersViewModel(mockFolders);

			assert.strictEqual(result[0].id, 'folder-a');
			assert.strictEqual(result[1].id, 'folder-b');
			assert.strictEqual(result[2].id, 'folder-c');

			assert.strictEqual(result[0].encodedDisplayName, 'first-folder');
			assert.strictEqual(result[1].encodedDisplayName, 'second-folder');
			assert.strictEqual(result[2].encodedDisplayName, 'third-folder');
		});

		it('should default missing or null displayOrder values to 100 when sorting', () => {
			const mockFolders = [
				{ id: 'folder-middle', displayName: 'middle', displayOrder: null },
				{ id: 'folder-first', displayName: 'first', displayOrder: 50 },
				{ id: 'folder-last', displayName: 'last', displayOrder: 150 }
			] as unknown as S62AFolder[];

			const result = createFoldersViewModel(mockFolders);

			assert.strictEqual(result[0].id, 'folder-first');
			assert.strictEqual(result[1].id, 'folder-middle');
			assert.strictEqual(result[2].id, 'folder-last');
		});
	});
});

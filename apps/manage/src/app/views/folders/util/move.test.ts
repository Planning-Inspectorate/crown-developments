import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildFolderTree, type FlatFolder } from './move.ts';

describe('move.ts', () => {
	describe('buildFolderTree', () => {
		it('should return an empty array when given an empty list', () => {
			const result = buildFolderTree([]);
			assert.deepStrictEqual(result, []);
		});

		it('should return all nodes as roots if no parentFolderIds are provided', () => {
			const flatFolders: FlatFolder[] = [
				{ id: '1', displayName: 'Root A' },
				{ id: '2', displayName: 'Root B', parentFolderId: null }
			];

			const result = buildFolderTree(flatFolders);

			assert.deepStrictEqual(result, [
				{ id: '1', displayName: 'Root A', children: [] },
				{ id: '2', displayName: 'Root B', parentFolderId: null, children: [] }
			]);
		});

		it('should correctly nest child folders under their parent', () => {
			const flatFolders: FlatFolder[] = [
				{ id: 'parent-1', displayName: 'Parent' },
				{ id: 'child-1', parentFolderId: 'parent-1', displayName: 'Child 1' },
				{ id: 'child-2', parentFolderId: 'parent-1', displayName: 'Child 2' }
			];

			const result = buildFolderTree(flatFolders);

			assert.deepStrictEqual(result, [
				{
					id: 'parent-1',
					displayName: 'Parent',
					children: [
						{ id: 'child-1', parentFolderId: 'parent-1', displayName: 'Child 1', children: [] },
						{ id: 'child-2', parentFolderId: 'parent-1', displayName: 'Child 2', children: [] }
					]
				}
			]);
		});

		it('should handle deep nesting (grandparents) regardless of input order', () => {
			const flatFolders: FlatFolder[] = [
				{ id: 'grandchild-1', parentFolderId: 'child-1', displayName: 'Grandchild' },
				{ id: 'grandparent-1', displayName: 'Grandparent' },
				{ id: 'child-1', parentFolderId: 'grandparent-1', displayName: 'Child' }
			];

			const result = buildFolderTree(flatFolders);

			assert.deepStrictEqual(result, [
				{
					id: 'grandparent-1',
					displayName: 'Grandparent',
					children: [
						{
							id: 'child-1',
							parentFolderId: 'grandparent-1',
							displayName: 'Child',
							children: [
								{
									id: 'grandchild-1',
									parentFolderId: 'child-1',
									displayName: 'Grandchild',
									children: []
								}
							]
						}
					]
				}
			]);
		});

		it('should treat an orphaned child (missing parent) as a root node', () => {
			const flatFolders: FlatFolder[] = [
				{ id: '1', displayName: 'Valid Root' },
				{ id: '2', parentFolderId: 'does-not-exist', displayName: 'Orphan' }
			];

			const result = buildFolderTree(flatFolders);

			assert.deepStrictEqual(result, [
				{ id: '1', displayName: 'Valid Root', children: [] },
				{ id: '2', parentFolderId: 'does-not-exist', displayName: 'Orphan', children: [] }
			]);
		});
	});
});

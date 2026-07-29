import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	addCaseIdToFolders,
	createFolders,
	findFolders,
	buildBreadcrumbItems,
	FOLDERS_MAP,
	getFolderPath
} from './folders.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

describe('Folder creation utils', () => {
	describe('findFolders', () => {
		const mockLookupMap = {
			TEST_TYPE_1: [{ displayName: 'Folder A', displayOrder: 1 }],
			TEST_TYPE_2: [{ displayName: 'Folder B', displayOrder: 2 }]
		};

		it('should return the correct folder structure for a known typeId', () => {
			const result = findFolders('TEST_TYPE_1' as any, mockLookupMap as any);
			assert.deepStrictEqual(result, mockLookupMap['TEST_TYPE_1']);
		});

		it('should return an empty array if typeId is not found in map', () => {
			const result = findFolders('UNKNOWN_TYPE' as any, mockLookupMap as any);
			assert.deepStrictEqual(result, []);
		});

		it('should work with the real FOLDER_TEMPLATES_MAP', () => {
			const result = findFolders(PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION, FOLDERS_MAP);
			assert.ok(Array.isArray(result));
		});
	});

	describe('addCaseIdToFolders', () => {
		const caseId = '1001';

		it('should inject caseId into a flat list of folders', () => {
			const inputFolders = [
				{ displayName: 'F1', displayOrder: 1 },
				{ displayName: 'F2', displayOrder: 2 }
			];

			const result = addCaseIdToFolders(inputFolders, caseId);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].s62aCaseId, caseId);
			assert.strictEqual(result[1].s62aCaseId, caseId);
		});

		it('should recursively inject caseId into nested "ChildFolders.create" arrays', () => {
			const inputFolders = [
				{
					displayName: 'Parent',
					displayOrder: 1,
					ChildFolders: {
						create: [
							{ displayName: 'Child 1', displayOrder: 1 },
							{ displayName: 'Child 2', displayOrder: 2 }
						]
					}
				}
			];

			const result = addCaseIdToFolders(inputFolders, caseId);

			assert.strictEqual(result[0].s62aCaseId, caseId);

			const children: any = result[0]?.ChildFolders?.create;
			assert.strictEqual(children?.length, 2);
			assert.strictEqual(children[0].s62aCaseId, caseId);
			assert.strictEqual(children[1].s62aCaseId, caseId);
		});

		it('should recursively inject caseId into deeply nested (3+ levels) arrays', () => {
			const inputFolders = [
				{
					displayName: 'Level 1',
					displayOrder: 1,
					ChildFolders: {
						create: [
							{
								displayName: 'Level 2',
								displayOrder: 1,
								ChildFolders: {
									create: [{ displayName: 'Level 3', displayOrder: 1 }]
								}
							}
						]
					}
				}
			];

			const result = addCaseIdToFolders(inputFolders, caseId);

			const level1 = result[0];
			const level2 = level1.ChildFolders?.create[0] as any;
			const level3 = level2.ChildFolders?.create[0] as any;

			assert.strictEqual(level1.s62aCaseId, caseId);
			assert.strictEqual(level2.s62aCaseId, caseId);
			assert.strictEqual(level3.s62aCaseId, caseId);
		});

		it('should not mutate the original objects', () => {
			const inputFolders = [{ displayName: 'F1', displayOrder: 1 }];
			const result = addCaseIdToFolders(inputFolders, caseId);

			assert.notStrictEqual(result[0], inputFolders[0]);
			assert.strictEqual((inputFolders[0] as any).s62aCaseId, undefined);
		});
	});

	describe('createFolders', () => {
		it('should call tx.folder.create for each top-level folder', async () => {
			const caseId = '2002';
			const folders = [
				{ displayName: 'Folder A', displayOrder: 1 },
				{ displayName: 'Folder B', displayOrder: 2 }
			];

			const mockCreate = mock.fn();
			const tx = { folder: { create: mockCreate } } as unknown as Prisma.TransactionClient;

			await createFolders(folders, caseId, tx);

			assert.strictEqual(mockCreate.mock.callCount(), 2);

			const firstCallArgs = mockCreate.mock.calls[0].arguments[0];
			assert.deepStrictEqual(firstCallArgs, {
				data: {
					displayName: 'Folder A',
					displayOrder: 1,
					s62aCaseId: '2002'
				}
			});
		});

		it('should pass nested structure to Prisma create correctly', async () => {
			const caseId = '3003';
			const folders = [
				{
					displayName: 'Parent',
					displayOrder: 1,
					ChildFolders: {
						create: [{ displayName: 'Child', displayOrder: 1 }]
					}
				}
			];

			const mockCreate = mock.fn();
			const tx = { folder: { create: mockCreate } } as unknown as Prisma.TransactionClient;

			await createFolders(folders, caseId, tx);

			assert.strictEqual(mockCreate.mock.callCount(), 1);

			const callData = mockCreate.mock.calls[0].arguments[0].data;

			assert.strictEqual(callData.s62aCaseId, caseId);
			assert.strictEqual(callData.ChildFolders.create[0].s62aCaseId, caseId);
		});
	});

	describe('buildBreadcrumbItems', () => {
		const caseId = 'case-123';
		const baseFoldersUrl = `/s62a/cases/${caseId}/case-folders`;

		it('should return only the base breadcrumb when folderPath is empty', () => {
			const result = buildBreadcrumbItems(caseId, []);

			assert.deepStrictEqual(result, [{ text: 'Manage case files', href: baseFoldersUrl }]);
		});

		it('should return base and one unlinked item when folderPath has one folder', () => {
			const folderPath = [{ id: 'folder-1', displayName: 'Root Folder', parentFolderId: null }];
			const result = buildBreadcrumbItems(caseId, folderPath);

			assert.deepStrictEqual(result, [
				{ text: 'Manage case files', href: baseFoldersUrl },
				{ text: 'Root Folder', href: undefined }
			]);
		});

		it('should generate linked intermediate breadcrumbs and unlinked last item for deep paths', () => {
			const folderPath = [
				{ id: 'folder-1', displayName: 'Representations', parentFolderId: null },
				{ id: 'folder-2', displayName: 'Original versions', parentFolderId: 'folder-1' },
				{ id: 'folder-3', displayName: 'Interested Parties', parentFolderId: 'folder-2' }
			];
			const result = buildBreadcrumbItems(caseId, folderPath);

			assert.deepStrictEqual(result, [
				{ text: 'Manage case files', href: baseFoldersUrl },
				{ text: 'Representations', href: `${baseFoldersUrl}/folder-1/representations` },
				{ text: 'Original versions', href: `${baseFoldersUrl}/folder-2/original-versions` },
				{ text: 'Interested Parties', href: undefined }
			]);
		});
	});

	describe('getFolderPath', () => {
		const mockFolders = [
			{ id: 'folder-1', displayName: 'Root', parentFolderId: null },
			{ id: 'folder-2', displayName: 'Child', parentFolderId: 'folder-1' },
			{ id: 'folder-3', displayName: 'Grandchild', parentFolderId: 'folder-2' },
			{ id: 'folder-4', displayName: 'Orphan', parentFolderId: 'missing-parent-id' }
		];

		it('should return a path with only the target folder when it has no parent', () => {
			const result = getFolderPath(mockFolders, 'folder-1');

			assert.deepStrictEqual(result, [{ id: 'folder-1', displayName: 'Root', parentFolderId: null }]);
		});

		it('should return the full ancestry chain from root to target folder in the correct order', () => {
			const result = getFolderPath(mockFolders, 'folder-3');

			assert.deepStrictEqual(result, [
				{ id: 'folder-1', displayName: 'Root', parentFolderId: null },
				{ id: 'folder-2', displayName: 'Child', parentFolderId: 'folder-1' },
				{ id: 'folder-3', displayName: 'Grandchild', parentFolderId: 'folder-2' }
			]);
		});

		it('should return an empty array if the target folderId is not in the list', () => {
			const result = getFolderPath(mockFolders, 'non-existent-id');

			assert.deepStrictEqual(result, []);
		});

		it('should gracefully stop walking up the tree if a parent is missing from the list', () => {
			const result = getFolderPath(mockFolders, 'folder-4');

			assert.deepStrictEqual(result, [{ id: 'folder-4', displayName: 'Orphan', parentFolderId: 'missing-parent-id' }]);
		});
	});
});

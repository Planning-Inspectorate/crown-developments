import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	addCaseIdToFolders,
	createFolders,
	findFolders,
	buildBreadcrumbItems,
	FOLDERS_MAP,
	getFolderPath,
	FOLDER_SYNC_RESULT,
	syncPreApplicationAdviceFolder
} from './folders.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	APPLICATION_FOLDERS,
	PRE_APPLICATION_ADVICE_FOLDER,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

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

	describe('syncPreApplicationAdviceFolder', () => {
		/** A tx whose live and deleted lookups return what the test needs. */
		const txWith = ({
			live = null,
			deleted = null
		}: {
			live?: { id: string } | null;
			deleted?: { id: string } | null;
		}) => {
			const findFirst = mock.fn(async (args: { where: { deletedAt: unknown }; orderBy?: unknown }) =>
				args.where.deletedAt === null ? live : deleted
			);
			const create = mock.fn(async (_args: { data: Record<string, unknown> }) => ({ id: 'folder-new' }));
			const update = mock.fn(async (_args: { where: { id: string }; data: { deletedAt: Date | null } }) => ({
				id: 'folder-1'
			}));
			const tx = { folder: { findFirst, create, update } } as unknown as Prisma.TransactionClient;
			return { tx, findFirst, create, update };
		};

		describe('when advice is given', () => {
			it('creates the folder when the case has never had one', async () => {
				const { tx, create, update } = txWith({});

				const result = await syncPreApplicationAdviceFolder('case-1', true, tx);

				assert.strictEqual(result, FOLDER_SYNC_RESULT.CREATED);
				assert.deepStrictEqual(create.mock.calls[0].arguments[0], {
					data: { displayName: 'Pre-application advice', displayOrder: 150, s62aCaseId: 'case-1' }
				});
				assert.strictEqual(update.mock.callCount(), 0);
			});

			it('leaves an existing folder alone', async () => {
				const { tx, create, update } = txWith({ live: { id: 'folder-live' } });

				const result = await syncPreApplicationAdviceFolder('case-1', true, tx);

				assert.strictEqual(result, FOLDER_SYNC_RESULT.UNCHANGED);
				assert.strictEqual(create.mock.callCount(), 0);
				assert.strictEqual(update.mock.callCount(), 0);
			});

			it('restores a soft-deleted folder instead of creating a new one', async () => {
				const { tx, create, update } = txWith({ deleted: { id: 'folder-deleted' } });

				const result = await syncPreApplicationAdviceFolder('case-1', true, tx);

				assert.strictEqual(result, FOLDER_SYNC_RESULT.RESTORED);
				assert.deepStrictEqual(update.mock.calls[0].arguments[0], {
					where: { id: 'folder-deleted' },
					data: { deletedAt: null }
				});
				assert.strictEqual(create.mock.callCount(), 0);
			});

			it('restores the most recently deleted folder', async () => {
				const { tx, findFirst } = txWith({ deleted: { id: 'folder-deleted' } });

				await syncPreApplicationAdviceFolder('case-1', true, tx);

				assert.deepStrictEqual(findFirst.mock.calls[1].arguments[0].orderBy, { deletedAt: 'desc' });
			});
		});

		describe('when advice is not given', () => {
			it('soft-deletes the folder rather than removing it', async () => {
				const { tx, create, update } = txWith({ live: { id: 'folder-live' } });

				const result = await syncPreApplicationAdviceFolder('case-1', false, tx);

				assert.strictEqual(result, FOLDER_SYNC_RESULT.DELETED);
				const { where, data } = update.mock.calls[0].arguments[0];
				assert.deepStrictEqual(where, { id: 'folder-live' });
				assert.ok(data.deletedAt instanceof Date);
				assert.strictEqual(create.mock.callCount(), 0);
			});

			it('does nothing when there is no folder to delete', async () => {
				const { tx, create, update } = txWith({});

				const result = await syncPreApplicationAdviceFolder('case-1', false, tx);

				assert.strictEqual(result, FOLDER_SYNC_RESULT.UNCHANGED);
				assert.strictEqual(create.mock.callCount(), 0);
				assert.strictEqual(update.mock.callCount(), 0);
			});
		});

		it('only looks at the top-level advice folder on this case', async () => {
			const { tx, findFirst } = txWith({});

			await syncPreApplicationAdviceFolder('case-1', true, tx);

			assert.deepStrictEqual(findFirst.mock.calls[0].arguments[0].where, {
				s62aCaseId: 'case-1',
				parentFolderId: null,
				displayName: 'Pre-application advice',
				deletedAt: null
			});
		});
	});

	describe('PRE_APPLICATION_ADVICE_FOLDER', () => {
		it('sits between The Planning Application and Working documents', () => {
			const orderOf = (name: string) => APPLICATION_FOLDERS.find((f) => f.displayName === name)?.displayOrder ?? NaN;

			assert.ok(orderOf('The Planning Application') < PRE_APPLICATION_ADVICE_FOLDER.displayOrder);
			assert.ok(PRE_APPLICATION_ADVICE_FOLDER.displayOrder < orderOf('Working documents'));
		});
	});
});

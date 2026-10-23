import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildCreateFolders, createFolderRecord, getNextDisplayOrder, getParentFolder } from './controller.ts';

describe('Create Folders Helpers', () => {
	describe('getParentFolder', () => {
		it('should return null if folderId is not provided', async () => {
			const db = {} as any;
			const result = await getParentFolder(db, null, 'case-1');
			assert.strictEqual(result, null);
		});

		it('should query the database for the specific folder and case', async () => {
			const mockDb = {
				folder: {
					findUnique: (args: any) => {
						if (args.where.id === 'folder-123' && args.where.s62aCaseId === 'case-1') {
							return Promise.resolve({ displayName: 'Target Folder' });
						}
						return Promise.resolve(null);
					}
				}
			} as any;

			const result = await getParentFolder(mockDb, 'folder-123', 'case-1');
			assert.deepStrictEqual(result, { displayName: 'Target Folder' });
		});
	});

	describe('getNextDisplayOrder', () => {
		it('should return 100 if no items exist (aggregation returns null)', async () => {
			const mockDb = {
				folder: {
					aggregate: () => Promise.resolve({ _max: { displayOrder: null } })
				}
			} as any;

			const result = await getNextDisplayOrder(mockDb, 'parent-1', 'case-123');
			assert.strictEqual(result, 100);
		});

		it('should return max + 100 if items exist', async () => {
			const mockDb = {
				folder: {
					aggregate: () => Promise.resolve({ _max: { displayOrder: 250 } })
				}
			} as any;

			const result = await getNextDisplayOrder(mockDb, 'parent-1', 'case-123');
			assert.strictEqual(result, 350);
		});
	});

	describe('createFolderRecord', () => {
		it('should create folder with correct parameters including isCustom flag', async () => {
			let capturedData: any;
			const mockDb = {
				folder: {
					create: (args: any) => {
						capturedData = args.data;
						return Promise.resolve({});
					}
				}
			};

			await createFolderRecord(mockDb as any, {
				name: 'New Folder',
				parentId: 'parent-123',
				caseId: 'case-999',
				order: 500
			});

			assert.strictEqual(capturedData.displayName, 'New Folder');
			assert.strictEqual(capturedData.parentFolderId, 'parent-123');
			assert.strictEqual(capturedData.s62aCaseId, 'case-999');
			assert.strictEqual(capturedData.displayOrder, 500);
			assert.strictEqual(capturedData.isCustom, true);
		});
		it('should store created folder name in session when folder is created', async () => {
			const mockService = {
				db: {
					folder: {
						aggregate: () => Promise.resolve({ _max: { displayOrder: 0 } }),
						create: () => Promise.resolve({ id: 'new-folder-id' })
					}
				},
				audit: {
					record: () => Promise.resolve()
				},
				logger: {
					error: () => {},
					info: () => {}
				}
			};

			const req = {
				params: { id: 'case-1', folderId: null },
				body: { folderName: 'Test Folder' },
				session: {
					account: { localAccountId: 'user-123' },
					folder: {}
				}
			};

			const res = {
				redirect: () => {}
			};

			const controller = buildCreateFolders(mockService as any);

			await controller(req as any, res as any, () => {});

			assert.deepStrictEqual((req.session as any).folder['case-1'], {
				createdFolderName: 'Test Folder'
			});
		});
	});
});

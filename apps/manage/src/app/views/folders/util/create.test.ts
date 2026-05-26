import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { addCaseIdToFolders, createFolders } from './create.ts';
import type { ManageService } from '../../../service.js';

describe('create.ts', () => {
	describe('addCaseIdToFolders', () => {
		it('should return an empty array if no folders are provided', () => {
			const result = addCaseIdToFolders([], 'case-123');
			assert.deepStrictEqual(result, []);
		});

		it('should append crownDevelopmentId to a flat list of folders', () => {
			const input = [
				{ displayName: 'Folder A', displayOrder: 1 },
				{ displayName: 'Folder B', displayOrder: 2 }
			];

			const result = addCaseIdToFolders(input, 'case-123');

			assert.deepStrictEqual(result, [
				{ displayName: 'Folder A', displayOrder: 1, crownDevelopmentId: 'case-123' },
				{ displayName: 'Folder B', displayOrder: 2, crownDevelopmentId: 'case-123' }
			]);
		});

		it('should recursively append crownDevelopmentId to deeply nested children', () => {
			const input = [
				{
					displayName: 'Parent',
					displayOrder: 1,
					ChildFolders: {
						create: [
							{
								displayName: 'Child',
								displayOrder: 1,
								ChildFolders: {
									create: [{ displayName: 'Grandchild', displayOrder: 1 }]
								}
							}
						]
					}
				}
			];

			const result = addCaseIdToFolders(input, 'case-123');

			assert.deepStrictEqual(result, [
				{
					displayName: 'Parent',
					displayOrder: 1,
					crownDevelopmentId: 'case-123',
					ChildFolders: {
						create: [
							{
								displayName: 'Child',
								displayOrder: 1,
								crownDevelopmentId: 'case-123',
								ChildFolders: {
									create: [
										{
											displayName: 'Grandchild',
											displayOrder: 1,
											crownDevelopmentId: 'case-123'
										}
									]
								}
							}
						]
					}
				}
			]);
		});
	});

	describe('createFolders', () => {
		it('should not call Prisma if the folder array is empty', async () => {
			const mockCreate = mock.fn(async (payload) => {});
			const mockTx = {
				s62AFolder: { create: mockCreate }
			} as unknown as ManageService['db'];

			await createFolders([], 'case-123', mockTx);

			assert.strictEqual(mockCreate.mock.callCount(), 0);
		});

		it('should call Prisma create for each top-level folder with mapped data', async () => {
			const mockCreate = mock.fn(async (payload) => {});
			const mockTx = {
				s62AFolder: { create: mockCreate }
			} as unknown as ManageService['db'];

			const input = [
				{ displayName: 'Root 1', displayOrder: 1 },
				{
					displayName: 'Root 2',
					displayOrder: 2,
					ChildFolders: {
						create: [{ displayName: 'Child 1', displayOrder: 1 }]
					}
				}
			];

			await createFolders(input, 'case-123', mockTx);

			assert.strictEqual(mockCreate.mock.callCount(), 2);

			assert.deepStrictEqual(mockCreate.mock.calls[0].arguments[0], {
				data: {
					displayName: 'Root 1',
					displayOrder: 1,
					crownDevelopmentId: 'case-123'
				}
			});

			assert.deepStrictEqual(mockCreate.mock.calls[1].arguments[0], {
				data: {
					displayName: 'Root 2',
					displayOrder: 2,
					crownDevelopmentId: 'case-123',
					ChildFolders: {
						create: [
							{
								displayName: 'Child 1',
								displayOrder: 1,
								crownDevelopmentId: 'case-123'
							}
						]
					}
				}
			});
		});
	});
});

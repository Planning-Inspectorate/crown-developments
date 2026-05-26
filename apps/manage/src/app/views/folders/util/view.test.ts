import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildBreadcrumbItems, type FolderBreadcrumb } from './view.ts';

describe('breadcrumbs', () => {
	describe('buildBreadcrumbItems', () => {
		it('should return only the base root link when the folder path is empty', () => {
			const result = buildBreadcrumbItems('case-123', []);

			assert.deepStrictEqual(result, [
				{
					text: 'Manage case files',
					href: '/cases/case-123/folders'
				}
			]);
		});

		it('should append a single folder without an href (current page)', () => {
			const folderPath: FolderBreadcrumb[] = [{ id: 'f-1', displayName: 'documents', parentFolderId: null }];

			const result = buildBreadcrumbItems('case-123', folderPath);

			assert.deepStrictEqual(result, [
				{
					text: 'Manage case files',
					href: '/cases/case-123/folders'
				},
				{
					text: 'documents',
					href: undefined
				}
			]);
		});

		it('should correctly build hrefs for intermediate folders and leave the last one undefined', () => {
			const folderPath: FolderBreadcrumb[] = [
				{ id: 'f-1', displayName: 'root-folder', parentFolderId: null },
				{ id: 'f-2', displayName: 'sub-folder', parentFolderId: 'f-1' },
				{ id: 'f-3', displayName: 'target-folder', parentFolderId: 'f-2' }
			];

			const result = buildBreadcrumbItems('case-123', folderPath);

			assert.deepStrictEqual(result, [
				{
					text: 'Manage case files',
					href: '/cases/case-123/folders'
				},
				{
					text: 'root-folder',
					href: '/cases/case-123/folders/f-1/root-folder'
				},
				{
					text: 'sub-folder',
					href: '/cases/case-123/folders/f-2/sub-folder'
				},
				{
					text: 'target-folder',
					href: undefined
				}
			]);
		});
	});
});

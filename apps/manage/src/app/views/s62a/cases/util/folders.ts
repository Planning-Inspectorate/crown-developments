import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	APPLICATION_FOLDERS,
	PRE_APPLICATION_FOLDERS,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';

export const FOLDERS_MAP = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: PRE_APPLICATION_FOLDERS,
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: APPLICATION_FOLDERS
};

type Folder = {
	displayName: string;
	displayOrder: number;
	ChildFolders?: { create: Folder[] };
};

/**
 * Breadcrumb item structure for breadcrumbs component
 */
export type BreadcrumbItem = {
	text: string;
	href?: string;
};

/**
 * Minimal folder info needed for breadcrumbs
 */
export type FolderBreadcrumb = {
	id: string;
	displayName: string;
	parentFolderId: string | null;
};

/**
 * Updates the static data passed in, appending a caseId
 */
export function addCaseIdToFolders(folders: Folder[], caseId: string) {
	return folders.map((folder) => {
		const folderWithId = {
			...folder,
			s62aCaseId: caseId
		};

		if (folder.ChildFolders?.create) {
			folderWithId.ChildFolders = {
				create: addCaseIdToFolders(folder.ChildFolders.create, caseId)
			};
		}

		return folderWithId;
	});
}

/**
 * Creates folders for a given case.
 */
export async function createFolders(folders: Folder[], caseId: string, tx: Prisma.TransactionClient) {
	const folderData = addCaseIdToFolders(folders, caseId);

	await Promise.all(
		folderData.map((folderData) =>
			tx.folder.create({
				data: folderData
			})
		)
	);
}

/**
 * Returns desired folder structure based on typeId & passed in lookup map.
 */
export function findFolders(
	typeId: (typeof PRE_APPLICATION_OR_APPLICATION_ID)[keyof typeof PRE_APPLICATION_OR_APPLICATION_ID],
	lookupMap: typeof FOLDERS_MAP
) {
	return lookupMap[typeId] || [];
}

/**
 * Builds breadcrumb items for the breadcrumbs component.
 * Structure: Manage case files > Folder > Subfolder > Subfolder
 */
export function buildBreadcrumbItems(caseId: string, folderPath: FolderBreadcrumb[]): BreadcrumbItem[] {
	const baseFoldersUrl = `/s62a/cases/${caseId}/case-folders`;

	// Start with "Manage case files" which links to the root folders page
	const breadcrumbItems: BreadcrumbItem[] = [
		{
			text: 'Manage case files',
			href: baseFoldersUrl
		}
	];

	// Add each folder in the path
	// All folders except the last one get links
	folderPath.forEach((folder, index) => {
		const isLastItem = index === folderPath.length - 1;

		breadcrumbItems.push({
			text: folder.displayName,
			// Last item (current page) shouldn't have a link per guidelines
			href: isLastItem ? undefined : `${baseFoldersUrl}/${folder.id}/${stringToKebab(folder.displayName)}`
		});
	});

	return breadcrumbItems;
}

/**
 * Takes a flat array of folders and builds the ancestry chain up to the root.
 * Returns folders in order from root to current folder.
 */
export function getFolderPath(allFolders: FolderBreadcrumb[], folderId: string): FolderBreadcrumb[] {
	const folderMap = new Map(allFolders.map((folder) => [folder.id, folder]));

	// Walk up the tree in memory
	const folderPath: FolderBreadcrumb[] = [];
	let currentId: string | null = folderId;

	while (currentId) {
		const folder = folderMap.get(currentId);
		if (!folder) break;

		folderPath.push(folder);
		currentId = folder.parentFolderId;
	}

	return folderPath.reverse();
}

import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	APPLICATION_FOLDERS,
	PRE_APPLICATION_ADVICE_FOLDER,
	PRE_APPLICATION_FOLDERS,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';

export const FOLDERS_MAP = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: PRE_APPLICATION_FOLDERS,
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: APPLICATION_FOLDERS
};

/**
 * What syncPreApplicationAdviceFolder did to the case's folders.
 */
export const FOLDER_SYNC_RESULT = Object.freeze({
	CREATED: 'created',
	RESTORED: 'restored',
	DELETED: 'deleted',
	UNCHANGED: 'unchanged'
} as const);

export type FolderSyncResult = (typeof FOLDER_SYNC_RESULT)[keyof typeof FOLDER_SYNC_RESULT];

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
 * Keeps the pre-application advice folder in step with the advice answer.
 *
 * With advice given, an existing folder is left alone, a soft-deleted one is
 * restored with its contents, and only otherwise is a new one created. Without
 * advice, a live folder is soft-deleted, so switching back restores it as it was.
 */
export async function syncPreApplicationAdviceFolder(
	caseId: string,
	adviceGiven: boolean,
	tx: Prisma.TransactionClient
): Promise<FolderSyncResult> {
	const folder = {
		s62aCaseId: caseId,
		parentFolderId: null,
		displayName: PRE_APPLICATION_ADVICE_FOLDER.displayName
	};

	const live = await tx.folder.findFirst({ where: { ...folder, deletedAt: null }, select: { id: true } });

	if (!adviceGiven) {
		if (!live) return FOLDER_SYNC_RESULT.UNCHANGED;

		await tx.folder.update({ where: { id: live.id }, data: { deletedAt: new Date() } });
		return FOLDER_SYNC_RESULT.DELETED;
	}

	if (live) return FOLDER_SYNC_RESULT.UNCHANGED;

	// Restore the most recent one, so a Yes/No/Yes cycle brings back the folder the user had
	const deleted = await tx.folder.findFirst({
		where: { ...folder, deletedAt: { not: null } },
		orderBy: { deletedAt: 'desc' },
		select: { id: true }
	});

	if (deleted) {
		await tx.folder.update({ where: { id: deleted.id }, data: { deletedAt: null } });
		return FOLDER_SYNC_RESULT.RESTORED;
	}

	await createFolders([PRE_APPLICATION_ADVICE_FOLDER], caseId, tx);
	return FOLDER_SYNC_RESULT.CREATED;
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

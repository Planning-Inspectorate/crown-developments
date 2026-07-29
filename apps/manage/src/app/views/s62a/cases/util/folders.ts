import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	APPLICATION_FOLDERS,
	PRE_APPLICATION_FOLDERS,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

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

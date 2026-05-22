import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

type Folder = {
	displayName: string;
	displayOrder: number;
	ChildFolders?: { create: Folder[] };
};

/**
 * Updates the static data passed in, appending a crownDevelopmentId recursively to all depths.
 * We return Prisma's native UncheckedCreateInput so the database accepts the raw caseId string.
 */
export function addCaseIdToFolders(folders: Folder[], caseId: string): Prisma.S62AFolderUncheckedCreateInput[] {
	return folders.map((folder) => {
		const folderWithId: Prisma.S62AFolderUncheckedCreateInput = {
			displayName: folder.displayName,
			displayOrder: folder.displayOrder,
			crownDevelopmentId: caseId
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
export async function createFolders(folders: Folder[], caseId: string, tx: ManageService['db']): Promise<void> {
	const foldersWithIds = addCaseIdToFolders(folders, caseId);

	await Promise.all(
		foldersWithIds.map((folderInput) =>
			tx.s62AFolder.create({
				data: folderInput
			})
		)
	);
}

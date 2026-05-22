import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildBreadcrumbItems, type FolderBreadcrumb } from '../../../../folders/util/view.ts';
import { normaliseArrayToString, stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

export function buildViewCaseFolder(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res, next) => {
		const id = req.params.id;
		const folderId = req.params.folderId;

		if (!id) {
			throw new Error('id param required');
		}

		const stringifiedId = normaliseArrayToString(id);

		if (!folderId) {
			throw new Error('folderId param required');
		}

		const stringifiedFolderId = normaliseArrayToString(folderId);

		try {
			const caseData = await db.crownDevelopment.findUnique({
				select: { reference: true },
				where: { id: stringifiedId }
			});

			if (!caseData) {
				return notFoundHandler(req, res);
			}

			const folderData = await db.s62AFolder.findUnique({
				where: { id: stringifiedFolderId },
				include: {
					ChildFolders: { where: { crownDevelopmentId: stringifiedId, deletedAt: null } },
					ParentFolder: { select: { id: true, displayName: true } }
				}
			});

			if (!folderData) {
				return notFoundHandler(req, res);
			}

			const currentPath = req.originalUrl.split('?')[0];

			const folderPath = await getFolderPath(db, stringifiedFolderId);
			const breadcrumbItems = buildBreadcrumbItems(stringifiedId, folderPath);

			const subFoldersViewModel = folderData.ChildFolders ? createFoldersViewModel(folderData.ChildFolders) : [];

			const baseFoldersUrl = `/cases/${stringifiedId}/folders`;

			return res.render('views/cases/view/folders/view/view.njk', {
				pageHeading: caseData.reference,
				folderName: folderData.displayName,
				backLinkUrl: folderData.ParentFolder
					? baseFoldersUrl + `/${folderData.ParentFolder.id}/${stringToKebab(folderData.ParentFolder.displayName)}`
					: baseFoldersUrl,
				baseFoldersUrl: baseFoldersUrl, // Used for creating the url of the sub-folders
				subFolders: subFoldersViewModel,
				currentUrl: req.originalUrl,
				currentPath: currentPath,
				breadcrumbItems,
				caseId: id
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching folder',
					logParams: { caseId: id, folderId }
				});
			}

			if (next) next(error);
		}
	};
}

/**
 * Fetches the folder path (ancestry chain) from current folder up to root.
 * Returns folders in order from root to current folder.
 */
export async function getFolderPath(db: ManageService['db'], folderId: string): Promise<FolderBreadcrumb[]> {
	const currentFolder = await db.s62AFolder.findUnique({
		where: { id: folderId },
		select: { crownDevelopmentId: true }
	});

	if (!currentFolder?.crownDevelopmentId) return [];

	const allFolders = await db.s62AFolder.findMany({
		where: { crownDevelopmentId: currentFolder.crownDevelopmentId },
		select: {
			id: true,
			displayName: true,
			parentFolderId: true
		}
	});

	const folderMap = new Map(allFolders.map((folder) => [folder.id, folder]));

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

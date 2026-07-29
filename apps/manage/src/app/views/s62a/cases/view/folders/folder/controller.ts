import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { buildBreadcrumbItems, getFolderPath } from '../../../util/folders.ts';

export function buildViewCaseFolder(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		let caseRow, currentFolder, subFolders, parentFolder, allFolders;
		try {
			const [folderData, allFoldersData] = await Promise.all([
				db.folder.findUnique({
					where: { id: folderId },
					include: {
						S62aCase: { select: { reference: true } },
						ChildFolders: { where: { s62aCaseId: id, deletedAt: null } },
						ParentFolder: { select: { id: true, displayName: true } }
					}
				}),
				db.folder.findMany({
					where: { s62aCaseId: id, deletedAt: null },
					select: {
						id: true,
						displayName: true,
						parentFolderId: true
					}
				})
			]);

			if (!folderData) throw new Error('Folder not found');

			const { S62aCase, ChildFolders, ParentFolder, ...restOfFolder } = folderData;

			caseRow = S62aCase;
			currentFolder = restOfFolder;
			subFolders = ChildFolders;
			parentFolder = ParentFolder;
			allFolders = allFoldersData;
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folders',
				logParams: {}
			});
		}

		if (!caseRow || !currentFolder) {
			return notFoundHandler(req, res);
		}

		const folderPath = getFolderPath(allFolders || [], folderId);
		const breadcrumbItems = buildBreadcrumbItems(id, folderPath);

		const subFoldersViewModel = subFolders ? createFoldersViewModel(subFolders) : [];
		const baseFoldersUrl = `/s62a/cases/${id}/case-folders`;

		return res.render('views/s62a/cases/view/folders/folder/view.njk', {
			reference: caseRow?.reference,
			folderName: currentFolder?.displayName,
			backLinkUrl: parentFolder
				? baseFoldersUrl + `/${parentFolder.id}/${stringToKebab(parentFolder.displayName)}`
				: baseFoldersUrl,
			baseFoldersUrl: baseFoldersUrl,
			subFolders: subFoldersViewModel,
			currentUrl: req.originalUrl,
			currentPath: req.originalUrl.split('?')[0],
			breadcrumbItems
		});
	};
}

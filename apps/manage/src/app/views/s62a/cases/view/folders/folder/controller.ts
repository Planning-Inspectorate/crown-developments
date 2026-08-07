import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { buildBreadcrumbItems, getFolderPath } from '../../../util/folders.ts';
import { createPaginationParams, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { PREVIEW_MIME_TYPES } from './upload/upload-utils.ts';
import { createDocumentsViewModel } from './view-model.ts';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request } from 'express';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';

export function buildViewCaseFolder(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		const { pageSize, skipSize } = getPaginationParams(req);

		let caseRow,
			currentFolder,
			subFolders,
			parentFolder,
			allFolders,
			totalDocCount = 0,
			paginatedDocs;

		try {
			const [folderData, allFoldersData, paginatedDocuments, totalDocumentCount] = await Promise.all([
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
				}),
				db.document.findMany({
					where: {
						s62aCaseId: id,
						folderId: folderId,
						deletedAt: null
					},
					skip: skipSize,
					take: pageSize,
					include: {
						Folder: true
					},
					orderBy: { uploadedDate: 'desc' }
				}),
				db.document.count({
					where: {
						s62aCaseId: id,
						folderId: folderId,
						deletedAt: null
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
			totalDocCount = totalDocumentCount || 0;
			paginatedDocs = paginatedDocuments;
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folders',
				logParams: {}
			});
		}

		if (!caseRow || !currentFolder || !paginatedDocs) {
			return notFoundHandler(req, res);
		}

		const [errorSummary, filesDeleted] = readAndClearSessionData(req);

		const banner = getBannerMessages(filesDeleted, errorSummary);

		const paginationParams = createPaginationParams(req, totalDocCount);

		const documentsViewModel = paginatedDocs ? createDocumentsViewModel(paginatedDocs, PREVIEW_MIME_TYPES) : [];

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
			breadcrumbItems,
			paginationParams,
			documents: documentsViewModel,
			baseUrl: req.baseUrl,
			errorSummary,
			caseId: id,
			banner
		});
	};
}

/**
 * Reads session data and clears it to avoid it being displayed > once.
 */
function readAndClearSessionData(req: Request) {
	const id = getStringParam(req.params, 'id');

	const errorSummary = readSessionData(req, id, 'filesErrors', false, 'folder');
	clearSessionData(req, id, 'filesErrors', 'folder');

	const filesDeleted = readSessionData(req, id, 'filesDeleted', false, 'folder');
	clearSessionData(req, id, 'filesDeleted', 'folder');

	return [errorSummary, filesDeleted];
}

/**
 * Builds out the various banners we will need on the case details page
 */
function getBannerMessages(filesDeleted: number | boolean | undefined, errorSummary?: { text: string }[] | boolean) {
	if (errorSummary) {
		return null;
	}

	const bannerBuilder = new BannerBuilder();

	if (typeof filesDeleted === 'number') {
		bannerBuilder.addSuccessText(`${filesDeleted} selected file${filesDeleted === 1 ? '' : 's'} deleted`);
		return bannerBuilder.build();
	}

	return bannerBuilder.build();
}

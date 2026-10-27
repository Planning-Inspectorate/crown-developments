import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { createFoldersViewModel } from './view-model.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';

/**
 * Builds the list view for the top-level folders associated with this case.
 */
export function buildViewCaseFolders(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		let caseRow, folders;
		try {
			[caseRow, folders] = await Promise.all([
				db.s62aCase.findUnique({
					select: {
						reference: true,
						_count: {
							select: {
								Documents: {
									where: {
										publishDate: { not: null },
										deletedAt: null
									}
								}
							}
						}
					},
					where: { id }
				}),
				db.folder.findMany({
					where: { s62aCaseId: id, parentFolderId: null, deletedAt: null }
				})
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folders',
				logParams: {}
			});
		}

		if (!caseRow || !folders) {
			return notFoundHandler(req, res);
		}

		const foldersViewModel = createFoldersViewModel(folders);

		// Boolean used to show a link to a special "folder" at the top for published docs, hidden if none.
		const hasAtLeastOnePublishedDocument = (caseRow?._count.Documents ?? 0) > 0;

		const deletedFolderName = popSessionData(req, id, 'deleted', false, 'folder');

		const banner = getBannerMessages(deletedFolderName);

		return res.render('views/s62a/cases/view/folders/view.njk', {
			pageHeading: caseRow?.reference,
			backLinkUrl: `/s62a/cases/${id}/overview`,
			backLinkText: 'Back to overview',
			folders: foldersViewModel,
			currentUrl: req.originalUrl,
			hasAtLeastOnePublishedDocument,
			banner
		});
	};
}

/**
 * Builds out the various banners we will need on the case details page
 */
function getBannerMessages(deletedFolderName?: string | false) {
	const bannerBuilder = new BannerBuilder();

	if (typeof deletedFolderName === 'string') {
		bannerBuilder.addSuccessText(`${deletedFolderName} folder deleted`);
	}

	return bannerBuilder.build();
}

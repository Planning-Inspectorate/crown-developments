import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { createFoldersViewModel } from './view-model.ts';

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
										publishDate: { not: null }
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

		return res.render('views/s62a/cases/view/folders/view.njk', {
			pageHeading: caseRow?.reference,
			backLinkUrl: `/s62a/cases/${id}/overview`,
			backLinkText: 'Back to overview',
			folders: foldersViewModel,
			currentUrl: req.originalUrl,
			hasAtLeastOnePublishedDocument
		});
	};
}

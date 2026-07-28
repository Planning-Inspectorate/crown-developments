import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
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
						reference: true
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

		return res.render('views/s62a/cases/view/folders/view.njk', {
			pageHeading: caseRow?.reference,
			backLinkUrl: `/s62a/cases/${id}/overview`,
			backLinkText: 'Back to overview',
			folders: foldersViewModel,
			currentUrl: req.originalUrl
		});
	};
}

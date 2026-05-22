import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createFoldersViewModel } from './view-model.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import type { Prisma, S62AFolder } from '@pins/crowndev-database/src/client/client.ts';

type CaseRowSelection = Prisma.CrownDevelopmentGetPayload<{
	select: { reference: true };
}>;

export function buildViewFolders(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		let caseRow: CaseRowSelection | null = null,
			folders: S62AFolder[] | null = null;
		try {
			[caseRow, folders] = await Promise.all([
				db.crownDevelopment.findUnique({
					select: {
						reference: true
					},
					where: { id }
				}),
				db.s62AFolder.findMany({
					where: { crownDevelopmentId: id, parentFolderId: null, deletedAt: null } // Only get top level folders for this view.
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

		return res.render('views/cases/view/folders/view.njk', {
			pageHeading: caseRow?.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			folders: foldersViewModel,
			currentUrl: req.originalUrl
		});
	};
}

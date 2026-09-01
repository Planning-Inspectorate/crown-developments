import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import { ALLOWED_MIME_TYPES } from './upload-utils.ts';
import { createUploadedFilesViewModel } from './view-model.ts';

/**
 * Builds the view that allows users to upload new files to a specific folder
 * Simulateneously shows a list of currently awaiting files to upload.
 */
export function buildUploadToFolderView(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		const uploadErrors = readSessionData(req, id, 'uploadErrors', [], 'files');

		// Clear updated flag if present so that we only see it once.
		clearSessionData(req, id, 'uploadErrors', 'files');

		let caseRow, folder, drafts;
		try {
			const folderData = await db.folder.findUnique({
				where: {
					id: folderId
				},
				include: {
					S62aCase: {
						select: {
							reference: true
						}
					},
					DraftDocuments: {
						where: {
							sessionKey: req.sessionID
						}
					}
				}
			});

			if (!folderData) {
				return notFoundHandler(req, res);
			}

			const { S62aCase, DraftDocuments, ...restOfFolder } = folderData;

			caseRow = S62aCase;
			folder = restOfFolder;
			drafts = DraftDocuments;
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching upload to folder view',
				logParams: {}
			});
		}

		if (!caseRow || !folder) {
			return notFoundHandler(req, res);
		}

		const errorSummary = typeof uploadErrors !== 'boolean' && uploadErrors.length ? uploadErrors : null;

		const backLinkUrl = req.baseUrl.replace(/\/upload\/?$/, '');

		return res.render('views/s62a/cases/view/folders/folder/upload/view.njk', {
			pageHeading: caseRow?.reference,
			backLinkUrl,
			currentUrl: req.originalUrl,
			folder,
			errorSummary,
			allowedMimeTypes: ALLOWED_MIME_TYPES,
			uploadedFiles: createUploadedFilesViewModel(drafts || [])
		});
	};
}

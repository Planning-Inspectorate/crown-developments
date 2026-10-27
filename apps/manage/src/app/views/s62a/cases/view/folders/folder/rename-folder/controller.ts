import type { ManageService } from '#service';
import { AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/actions.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import { isSafeRelativeUrl } from '@pins/crowndev-lib/util/string.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler, AsyncRequestHandlerWithBody } from '@planning-inspectorate/core/util';
import { addSessionData, wrapPrismaError } from '@planning-inspectorate/core/util';

/**
 * Controller to render the Rename Folder view (get)
 */
export function buildRenameFolderView(service: ManageService): AsyncRequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		let folder;

		try {
			folder = await db.folder.findUnique({
				select: {
					displayName: true
				},
				where: {
					id: folderId,
					deletedAt: null
				}
			});
		} catch (error) {
			if (next) next(error);
		}

		if (!folder) {
			return notFoundHandler(req, res);
		}

		const errorSummary = popSessionData(req, id, 'createFolderErrors', null, 'folders');
		const erroredFolderName = popSessionData(req, id, 'erroredFolderName', null, 'folders');

		const returnUrl = req.baseUrl.replace(/\/rename-folder\/?$/, '');

		return res.render('views/s62a/cases/view/folders/folder/rename-folder/view.njk', {
			backLinkUrl: isSafeRelativeUrl(returnUrl) ? returnUrl : '/',
			errorSummary,
			currentFolderName: erroredFolderName ?? folder.displayName
		});
	};
}

/**
 * Controller to handle the folder renaming logic (post)
 */
export function buildRenameFolder(service: ManageService): AsyncRequestHandlerWithBody<{ folderName: string }> {
	const { db, logger } = service;

	return async (req, res) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		let existingFolder;
		let newFolderName;
		try {
			const { folderName } = req.body;

			newFolderName = folderName;

			// Fetch old name before renaming
			existingFolder = await db.folder.findUnique({
				where: { id: folderId },
				select: { displayName: true }
			});

			await renameFolderRecord(db, {
				name: folderName,
				folderId
			});

			addSessionData(
				req,
				folderId,
				{
					renamed: true
				},
				'folder'
			);
		} catch (error) {
			return wrapPrismaError({
				error,
				logger,
				message: 'renaming folder',
				logParams: {}
			});
		}

		const oldFolderName = existingFolder?.displayName;

		if (oldFolderName !== newFolderName) {
			await recordAuditSafely({
				service,
				dataModel: CASE_DATA_MODEL.S62A,
				entries: [
					{
						caseId: id,
						userId: getAuditUserId(req.session?.account?.localAccountId),
						action: AUDIT_ACTIONS.FOLDER_RENAMED,
						metadata: {
							oldFolderName: oldFolderName ?? '-',
							folderName: newFolderName
						}
					}
				],
				logContext: { caseId: id }
			});
		}

		const returnUrl = req.baseUrl.replace(/\/rename-folder\/?$/, '');

		return res.redirect(isSafeRelativeUrl(returnUrl) ? returnUrl : '/');
	};
}

/**
 * Saves folder rename to Db
 */
export async function renameFolderRecord(
	db: ManageService['db'],
	params: {
		name: string;
		folderId: string;
	}
) {
	await db.folder.update({
		where: {
			id: params.folderId
		},
		data: {
			displayName: params.name
		}
	});
}

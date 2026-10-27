import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/actions.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { CASE_DATA_MODEL, type ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { addSessionData, wrapPrismaError } from '@planning-inspectorate/core/util';
import type { Request, Response } from 'express';

type FolderPartialSelect = Prisma.FolderGetPayload<{
	select: {
		id: true;
		displayName: true;
		s62aCaseId: true;
		ParentFolder: {
			select: {
				id: true;
				displayName: true;
			};
		};
	};
}>;

type FolderContext = {
	folder: FolderPartialSelect;
	backLinkUrl: string;
	currentUrl: string;
};

/**
 * Grabs folder and metadata for displaying,
 * used inside the main view but also when
 * re-rendering after an error with POST-ing
 */
async function getFolderContext(req: Request, res: Response, db: ManageService['db'], folderId: string) {
	const folder = await db.folder.findUnique({
		select: {
			id: true,
			displayName: true,
			s62aCaseId: true,
			ParentFolder: {
				select: {
					id: true,
					displayName: true
				}
			}
		},
		where: { id: folderId }
	});

	if (!folder) {
		return notFoundHandler(req, res);
	}

	const backLinkUrl = `/s62a/cases/${folder.s62aCaseId}/case-folders/${folder.id}/${stringToKebab(folder.displayName)}`;

	const currentUrl = `${backLinkUrl}/delete-folder`;

	return { folder, backLinkUrl, currentUrl };
}

/**
 * Renders the page that asks for confirmation, used on load and if an
 * error occurs during POST-ing
 */
function renderConfirmationView(
	res: Response,
	context: FolderContext | void,
	errorSummary?: ErrorSummaryItem[] | null | false
) {
	if (errorSummary) {
		res.locals.errorSummary = errorSummary;
	}

	return res.render('views/s62a/cases/view/folders/folder/delete-folder/view.njk', {
		pageHeading: 'Delete folder',
		backLinkUrl: context?.backLinkUrl ? context.backLinkUrl : '/',
		folders: context?.folder ? [context.folder] : [],
		currentUrl: context?.currentUrl ? context.currentUrl : '/'
	});
}

export function buildDeleteFolderView(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		try {
			const context = await getFolderContext(req, res, db, folderId);

			const errorSummary = popSessionData(req, id, 'deleteFolderErrors', false, 'folders');

			return renderConfirmationView(res, context, errorSummary);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folder',
				logParams: { folderId }
			});
			throw error;
		}
	};
}

export function buildDeleteFolderController(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);

		const context = await getFolderContext(req, res, db, folderId);

		try {
			await db.folder.update({
				where: { id: folderId },
				data: {
					deletedAt: new Date()
				}
			});

			// We add it with the id of the 'case' but not the folder, because we
			// need to check this from outside of the folder's page (its parent)
			addSessionData(req, id, { deleted: context?.folder.displayName }, 'folder');
		} catch (error) {
			logger.error({ error, folderId }, 'Failed to delete folder');

			const errorMessage = [{ text: 'Failed to delete folder, please try again.', href: '#folder' }];

			return renderConfirmationView(res, context, errorMessage);
		}

		await recordAuditSafely({
			service,
			dataModel: CASE_DATA_MODEL.S62A,
			entries: [
				{
					caseId: id,
					userId: getAuditUserId(req.session?.account?.localAccountId),
					action: AUDIT_ACTIONS.FOLDER_DELETED,
					metadata: { folderName: context?.folder.displayName }
				}
			],
			logContext: { caseId: id }
		});

		const returnUrl = getRedirectUrl(context?.folder);

		return res.redirect(returnUrl);
	};
}

/**
 * Generates a redirect url based on whether we are inside of a folder
 * or on the base overview page.
 */
export function getRedirectUrl(folder?: FolderPartialSelect) {
	if (!folder) return '/';

	const baseUrl = `/s62a/cases/${folder.s62aCaseId}/case-folders`;

	if (folder.ParentFolder && folder.ParentFolder.displayName) {
		return `${baseUrl}/${folder.ParentFolder.id}/${stringToKebab(folder.ParentFolder.displayName)}`;
	}

	return baseUrl;
}

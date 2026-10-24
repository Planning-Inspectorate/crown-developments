import type { ManageService } from '#service';
import { AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/actions.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { getOptionalStringParam, getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import { isSafeRelativeUrl, stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandlerWithBody } from '@planning-inspectorate/core/util';
import { addSessionData, wrapPrismaError } from '@planning-inspectorate/core/util';
import type { NextFunction, Request, Response } from 'express';

/**
 * Controller to render the Create Folder view (get)
 */
export function viewCreateCaseFolders(req: Request, res: Response, next: NextFunction) {
	try {
		const id = getStringParam(req.params, 'id');

		const errorSummary = popSessionData(req, id, 'createFolderErrors', null, 'folders');
		const erroredFolderName = popSessionData(req, id, 'erroredFolderName', null, 'folders');

		const returnUrl = req.baseUrl.replace(/\/create-folder\/?$/, '');

		return res.render('views/s62a/cases/view/folders/create/view.njk', {
			backLinkUrl: isSafeRelativeUrl(returnUrl) ? returnUrl : '/',
			errorSummary,
			currentFolderName: erroredFolderName
		});
	} catch (error) {
		if (next) next(error);
	}
}

/**
 * Controller to handle the folder creation logic (post)
 */
export function buildCreateFolders(service: ManageService): AsyncRequestHandlerWithBody<{ folderName: string }> {
	const { db, logger } = service;

	return async (req, res) => {
		try {
			const id = getStringParam(req.params, 'id');

			const folderId = getOptionalStringParam(req.params, 'folderId');

			const { folderName } = req.body;

			const parentFolder = await getParentFolder(db, folderId, id);

			if (folderId && !parentFolder) {
				return notFoundHandler(req, res);
			}

			const nextDisplayOrder = await getNextDisplayOrder(db, folderId, id);

			const createdFolder = await createFolderRecord(db, {
				name: folderName,
				parentId: folderId,
				caseId: id,
				order: nextDisplayOrder
			});

			await recordAuditSafely({
				service,
				dataModel: CASE_DATA_MODEL.S62A,
				entries: [
					{
						caseId: id,
						userId: getAuditUserId(req.session?.account?.localAccountId),
						action: AUDIT_ACTIONS.FOLDER_CREATED,
						metadata: { folderName }
					}
				],
				logContext: { caseId: id }
			});

			addSessionData(
				req,
				id,
				{
					createdFolderName: folderName
				},
				'folder'
			);

			const newFolderUrl = `/s62a/cases/${id}/case-folders/${createdFolder.id}/${stringToKebab(createdFolder.displayName)}`;

			return res.redirect(newFolderUrl);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'creating folders',
				logParams: {}
			});
		}
	};
}

/**
 * Verifies if a parent folder exists and belongs to the specified case
 */
export async function getParentFolder(db: ManageService['db'], folderId: string | null, caseId: string) {
	if (!folderId) return null;

	return db.folder.findUnique({
		where: { id: folderId, s62aCaseId: caseId },
		select: { displayName: true }
	});
}

/**
 * Calculates the next available display order for the new folder,
 * should be highested number in folder + 100.
 */
export async function getNextDisplayOrder(db: ManageService['db'], parentFolderId: string | null, caseId: string) {
	const aggregation = await db.folder.aggregate({
		where: {
			parentFolderId,
			deletedAt: null,
			s62aCaseId: caseId
		},
		_max: {
			displayOrder: true
		}
	});

	const currentMax = aggregation._max.displayOrder ?? 0;
	return currentMax + 100;
}

/**
 * Saves folder to Db
 */
export async function createFolderRecord(
	db: ManageService['db'],
	params: {
		name: string;
		parentId: string | null;
		caseId: string;
		order: number;
	}
) {
	return db.folder.create({
		data: {
			displayName: params.name,
			parentFolderId: params.parentId,
			s62aCaseId: params.caseId,
			displayOrder: params.order,
			isCustom: true
		}
	});
}

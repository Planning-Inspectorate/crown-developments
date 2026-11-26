import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { Request, RequestHandler, Response } from 'express';
import type { AsyncRequestHandlerWithLocals } from '@planning-inspectorate/core/util';
import { buildFolderTree, checkFileNamesConflict } from '../../../../../util/folders.ts';
import type { Logger } from 'pino';
import { clearDataFromSession, list } from '@planning-inspectorate/dynamic-forms';
import { isSafeRelativeUrl, stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { addSessionData, wrapPrismaError } from '@planning-inspectorate/core/util';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { JOURNEY_ID } from './journey.ts';
import type { FolderNode } from '@pins/crowndev-lib/forms/custom-components/nested-folder-radio/question.ts';
import { recordS62aFileAudit } from '../../../../../audit/files.ts';
import { FILE_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/files.ts';
import type { MoveFileJourneyLocals } from './locals.ts';

const documentFindManySelectArg = {
	id: true,
	fileName: true,
	Folder: { select: { displayName: true } }
} as const satisfies Prisma.DocumentSelect;

export interface RequestWithFolderStructure extends Request {
	folderStructure?: FolderNode[];
}

/**
 * Creates the middleware that fetches the case + folders from the DB
 * and attaches them to res.locals so the Question can see them.
 */
export function buildLoadCaseData(service: ManageService): RequestHandler {
	const { db } = service;
	return async (req: RequestWithFolderStructure, res, next) => {
		const id = getStringParam(req.params, 'id');

		const caseData = await db.s62aCase.findUnique({
			where: { id },
			include: {
				Folders: {
					where: { deletedAt: null },
					orderBy: [{ displayOrder: 'asc' }, { displayName: 'asc' }]
				}
			}
		});

		if (!caseData) {
			return notFoundHandler(req, res);
		}

		req.folderStructure = buildFolderTree(caseData.Folders);

		next();
	};
}

/**
 * Grabs the important data, files to move and the folder to move
 * them to. Errors, clears session, redirects if any issues are found.
 */
export function validateRequestState(
	req: Request,
	res: Response<unknown, MoveFileJourneyLocals>,
	caseId: string,
	journeyId: string,
	logger: Logger
) {
	const journeyResponse = res.locals?.journeyResponse;
	const fileIds = req.session.moveFilesIds;

	if (!journeyResponse) {
		throw new Error('Valid journey response and answers object required');
	}

	if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
		logger.warn({ caseId }, 'No file Ids found in session during save');

		// Wipe current data from journey if it got corrupted
		clearDataFromSession({ req, journeyId });

		return res.redirect(`/s62a/cases/${caseId}/case-folders`);
	}

	const { fileLocation } = journeyResponse.answers;

	if (!fileLocation) {
		throw new Error('No destination folder selected');
	}

	return { fileIds, destinationFolderId: fileLocation };
}

/**
 * Moves files to new folder, checks that the folder in questino
 * is in the case of the current folder / documents to avoid cross
 * case contamination.
 */
export async function moveFilesTransaction(
	tx: Prisma.TransactionClient,
	caseId: string,
	destinationFolderId: string,
	fileIds: string[],
	logger: Logger
) {
	const targetFolder = await tx.folder.findUnique({
		where: { id: destinationFolderId, deletedAt: null }
	});

	if (!targetFolder) {
		throw new Error(`Target folder ${destinationFolderId} not found`);
	}

	if (targetFolder.s62aCaseId !== caseId) {
		logger.error(
			{
				targetFolderCaseId: targetFolder.s62aCaseId,
				requestCaseId: caseId
			},
			'Attempted to move files to a folder in a different case'
		);

		throw new Error('Target folder does not belong to the current case');
	}

	const result = await tx.document.updateMany({
		where: {
			id: { in: fileIds },
			s62aCaseId: caseId
		},
		data: {
			folderId: destinationFolderId
		}
	});

	logger.info(
		{
			count: result.count,
			destinationFolderId,
			caseId
		},
		'Moved documents to new folder'
	);
}

export function buildListController(listFn = list): RequestHandler {
	return async (req: Request, res: Response) => {
		const cancelUrl = req.baseUrl.split('/move-files')[0];

		await listFn(req, res, '', {
			backLinkUrl: `${req.baseUrl}/folder/file-location`,
			pageHeading: 'Check details and update file location',
			cancelUrl: isSafeRelativeUrl(cancelUrl) ? cancelUrl : '/'
		});
	};
}

/**
 * Controller for saving the new folder to the documents. Redirects to the new folder.
 */
export function buildSaveController(service: ManageService): AsyncRequestHandlerWithLocals<MoveFileJourneyLocals> {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, folderId, folderName } = getStringParams(req.params, ['id', 'folderId', 'folderName']);

		const state = validateRequestState(req, res, id, JOURNEY_ID, logger);
		if (!state) return;

		const { fileIds, destinationFolderId } = state;

		const [documentsBeforeMove, destinationFolder] = await Promise.all([
			db.document.findMany({
				where: { id: { in: fileIds } },
				select: documentFindManySelectArg
			}),
			db.folder.findUnique({
				where: { id: destinationFolderId },
				include: {
					Documents: {
						where: { deletedAt: null },
						select: { fileName: true }
					}
				}
			})
		]);

		if (!destinationFolder) {
			throw new Error(`Target folder ${destinationFolderId} not found`);
		}

		if (destinationFolder.s62aCaseId !== id) {
			logger.error(
				{ targetFolderCaseId: destinationFolder.s62aCaseId, requestCaseId: id },
				'Attempted to move files to a folder in a different case'
			);
			throw new Error('Target folder does not belong to the current case');
		}

		const existingFileNames = new Set(destinationFolder.Documents.map((doc) => doc.fileName));
		const fileNames = documentsBeforeMove.map((doc) => doc.fileName);
		const nameConflicts =
			checkFileNamesConflict(fileNames, existingFileNames)?.map((error) => ({ ...error, href: '#' })) ?? null;
		if (nameConflicts && nameConflicts.length > 0) {
			addSessionData(req, id, { moveFileErrors: nameConflicts }, 'move-files');

			return res.redirect(`/s62a/cases/${id}/case-folders/${folderId}/${folderName}/move-files`);
		}

		try {
			await db.$transaction(async ($tx) => {
				await moveFilesTransaction($tx, id, destinationFolderId, fileIds, logger);
			});

			// Will show the success banner once we have redirected to the new folder page.
			addSessionData(req, destinationFolderId, { filesMoved: fileIds.length }, 'folder');
			delete req.session.moveFilesIds;
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'moving documents',
				logParams: { caseId: id, destinationFolderId }
			});
		}

		// Needed to get previous folder name, will be same for all documents
		const sampleDoc = documentsBeforeMove[0];

		await recordS62aFileAudit(service, req, id, fileNames, FILE_AUDIT_ACTIONS.moved, {
			oldFolderName: sampleDoc.Folder?.displayName ?? '-',
			folderName: destinationFolder?.displayName ?? '-'
		});

		const { displayName } = destinationFolder;
		if (!displayName) {
			return notFoundHandler(req, res);
		}

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID
		});

		res.redirect(`/s62a/cases/${id}/case-folders/${destinationFolderId}/${stringToKebab(displayName)}`);
	};
}

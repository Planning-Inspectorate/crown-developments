import type { ManageService } from '#service';
import { getOptionalStringParams, getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { sanitisePath } from '@pins/crowndev-lib/util/string.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { addSessionData } from '@planning-inspectorate/core/util';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

export const FOLDER_NAMES_REGEX = /^(?!.*'')[a-zA-Z0-9 .\-_()&'/]+$/;

/**
 * Validates that a folder being created has a valid name.
 * The parentFolderId is optional (null means creating at root level).
 */
export function buildValidateFolderCreate(
	service: ManageService,
	setSessionData: typeof addSessionData = addSessionData
): RequestHandler {
	const { db } = service;

	return async (req: Request<ParamsDictionary, unknown, { folderName: string }>, res: Response, next: NextFunction) => {
		const caseId = getStringParam(req.params, 'id');
		const { folderId: parentFolderId, folderName: parentFolderName } = getOptionalStringParams(req.params, [
			'folderId',
			'folderName'
		]);
		const folderName = sanitisePath(req.body.folderName);

		// Rebuild return URL for security
		const returnUrl =
			parentFolderId && parentFolderName
				? `/s62a/cases/${caseId}/case-folders/${parentFolderId}/${encodeURIComponent(parentFolderName)}/create-folder`
				: `/s62a/cases/${caseId}/case-folders/create-folder`;

		const syntaxError = getFolderSyntaxError(folderName);
		if (syntaxError) {
			return handleFolderValidationError(req, res, setSessionData, caseId, folderName, syntaxError, returnUrl);
		}

		const duplicateError = await getDuplicateErrorsCreate(db, caseId, parentFolderId, folderName);
		if (duplicateError) {
			return handleFolderValidationError(req, res, setSessionData, caseId, folderName, duplicateError, returnUrl);
		}

		req.body.folderName = folderName;
		next();
	};
}

/**
 * Validates that a folder being renamed has a valid name.
 * The folderId (folder being renamed) is required.
 */
export function buildValidateFolderRename(
	service: ManageService,
	setSessionData: typeof addSessionData = addSessionData
): RequestHandler {
	const { db } = service;

	return async (req: Request<ParamsDictionary, unknown, { folderName: string }>, res: Response, next: NextFunction) => {
		const {
			id: caseId,
			folderId,
			folderName: currentFolderName
		} = getStringParams(req.params, ['id', 'folderId', 'folderName']);
		const folderName = sanitisePath(req.body.folderName);
		const returnUrl = `/s62a/cases/${caseId}/case-folders/${folderId}/${encodeURIComponent(currentFolderName)}/rename-folder`;

		const syntaxError = getFolderSyntaxError(folderName);
		if (syntaxError) {
			return handleFolderValidationError(req, res, setSessionData, caseId, folderName, syntaxError, returnUrl);
		}

		try {
			const duplicateError = await getDuplicateErrorsRename(req, res, db, caseId, folderId, folderName);
			if (duplicateError) {
				return handleFolderValidationError(req, res, setSessionData, caseId, folderName, duplicateError, returnUrl);
			}
		} catch (err) {
			return next(err);
		}

		req.body.folderName = folderName;
		next();
	};
}

/**
 * Handles folder validation errors by storing them in session and redirecting.
 */
export function handleFolderValidationError(
	req: Request,
	res: Response,
	setSessionData: typeof addSessionData,
	caseId: string,
	folderName: string,
	error: { text: string; href: string },
	returnUrl: string
): void {
	setSessionData(
		req,
		caseId,
		{
			createFolderErrors: [error],
			erroredFolderName: folderName
		},
		'folders'
	);

	// returnUrl is rebuilt from the route's own params rather than
	// request-controlled URL data, so it's always a known, local path.
	res.redirect(returnUrl);
}

/**
 * Checks for basic syntax errors like too long, too short, obscure
 * characters
 */
export function getFolderSyntaxError(folderName: string) {
	if (!folderName || folderName.length < 3 || folderName.length > 255) {
		return {
			text: 'Folder name must be between 3 and 255 characters',
			href: '#folderName'
		};
	}

	if (!FOLDER_NAMES_REGEX.test(folderName)) {
		return {
			text: 'Folder name must only include letters a to z, numbers and special characters such as spaces, underscores, hyphens, ampersand, brackets, forward slashes and single apostrophes',
			href: '#folderName'
		};
	}

	return null;
}

/**
 * Checks for duplicate folder names in the same case & folder, is case insensitive, so FoLdEr1 will throw a duplicate
 * match if folder1 already exists.
 */
export async function getDuplicateErrorsCreate(
	db: ManageService['db'],
	caseId: string,
	parentFolderId: string | null,
	folderName: string
) {
	const existingFolder = await db.folder.findFirst({
		where: {
			s62aCaseId: caseId,
			parentFolderId: parentFolderId,
			displayName: folderName,
			deletedAt: null
		}
	});

	if (existingFolder && existingFolder.displayName.toLowerCase() === folderName.toLowerCase()) {
		return {
			text: 'Folder name already exists',
			href: '#folderName'
		};
	}

	return null;
}

/**
 * Checks that you are not renaming a folder to an existing folder within the same parent
 */
export async function getDuplicateErrorsRename(
	req: Request,
	res: Response,
	db: ManageService['db'],
	caseId: string,
	currentFolderId: string,
	folderName: string
) {
	const currentFolder = await db.folder.findUnique({
		select: {
			parentFolderId: true
		},
		where: {
			id: currentFolderId
		}
	});

	if (!currentFolder) return notFoundHandler(req, res);

	const existingFolder = await db.folder.findFirst({
		where: {
			s62aCaseId: caseId,
			parentFolderId: currentFolder.parentFolderId,
			displayName: folderName,
			deletedAt: null,
			NOT: { id: currentFolderId }
		}
	});

	if (existingFolder && existingFolder.displayName.toLowerCase() === folderName.toLowerCase()) {
		return {
			text: 'Folder name already exists',
			href: '#folderName'
		};
	}

	return null;
}

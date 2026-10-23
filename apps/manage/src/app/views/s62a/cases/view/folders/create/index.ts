import type { ManageService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { Router as createRouter } from 'express';
import { buildValidateFolderCreate } from '../util/folder-validation.ts';
import { buildCreateFolders, viewCreateCaseFolders } from './controller.ts';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const validateFolder = buildValidateFolderCreate(service);
	const createCaseFolders = buildCreateFolders(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewCreateCaseFolders)) // Gets the "create folder" view
		.post(validateIdFormat, validateFolder, asyncHandler(createCaseFolders)); // Posts to create the folder

	return router;
}

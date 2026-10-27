import type { ManageService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { Router as createRouter } from 'express';
import { buildDeleteFolderController, buildDeleteFolderView } from './controller.ts';
import { buildValidateDeleteFolder } from './validation.ts';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewDeleteFolder = buildDeleteFolderView(service);
	const deleteFolderController = buildDeleteFolderController(service);
	const validateFolder = buildValidateDeleteFolder(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewDeleteFolder)) // Gets the "delete folder" view
		.post(validateIdFormat, validateFolder, asyncHandler(deleteFolderController)); // Posts to delete the folder

	return router;
}

import type { ManageService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { Router as createRouter } from 'express';
import { buildRenameFolder, buildRenameFolderView } from './controller.ts';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';
import { buildValidateFolderRename } from '../../util/folder-validation.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewRenameFolders = buildRenameFolderView(service);
	const renameFolder = buildRenameFolder(service);
	const validateFolder = buildValidateFolderRename(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewRenameFolders)) // Gets the "rename folder" view
		.post(validateIdFormat, validateFolder, asyncHandler(renameFolder)); // Posts to rename the folder

	return router;
}

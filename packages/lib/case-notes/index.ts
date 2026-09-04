import { Router as createRouter } from 'express';
import type { IRouter } from 'express';
import {
	buildCreateCaseNote,
	buildViewCaseNotes,
	buildViewAddCaseNotes,
	buildCreateCaseNoteHandler,
	buildFetchCaseNotesMiddleware
} from './controller.ts';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';
import { validateIdFormat } from '../../../apps/manage/src/app/views/cases/view/controller.ts';
import type { CaseDataModel } from '../util/types.ts';

import type { AuditService } from '@pins/crowndev-lib/audit/index.js';
import type { InitEntraClient } from '@pins/crowndev-lib/graph/types.js';
import type { Logger } from 'pino';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

export interface CaseNotesService {
	db: PrismaClient;
	logger: Logger;
	audit: AuditService;
	getEntraClient: InitEntraClient;
	entraGroupIds: {
		caseOfficers: string;
		inspectors: string;
	};
	isAuditLive?: boolean;
}

export function createRoutes(service: CaseNotesService, dataModel: CaseDataModel): IRouter {
	const router = createRouter({ mergeParams: true });

	const [createCaseNote, viewCaseNotes, validateCaseNotesMiddleware] = createMiddlewares(service, dataModel);

	const viewAddCaseNotes = buildViewAddCaseNotes(service, dataModel);

	const postAddCaseNotes = buildCreateCaseNoteHandler(service, dataModel);

	const fetchCaseNoteData = buildFetchCaseNotesMiddleware(service, dataModel);

	if (dataModel === 'crown') {
		router
			.route('/')
			.get(validateIdFormat, viewCaseNotes)
			.post(validateIdFormat, validateCaseNotesMiddleware, createCaseNote);
	} else if (dataModel === 's62a') {
		router.route('/').get(fetchCaseNoteData);

		router
			.route('/add-case-note')
			.get(viewAddCaseNotes)
			.post(validateIdFormat, validateCaseNotesMiddleware, postAddCaseNotes);
	}

	return router;
}

function createMiddlewares(service: CaseNotesService, dataModel: CaseDataModel) {
	return [
		buildCreateCaseNote(service, dataModel),
		buildViewCaseNotes(service, dataModel),
		buildValidateCaseNotesMiddleware()
	];
}

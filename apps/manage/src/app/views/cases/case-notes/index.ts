import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildCreateCaseNote, buildViewCaseNotes } from './controller.ts';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';
import { validateIdFormat } from '../view/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [createCaseNote, viewCaseNotes, validateCaseNotesMiddleware] = createMiddlewares(service);

	router
		.route('/')
		.get(validateIdFormat, viewCaseNotes)
		.post(validateIdFormat, validateCaseNotesMiddleware, createCaseNote);

	return router;
}

function createMiddlewares(service: ManageService) {
	return [buildCreateCaseNote(service), buildViewCaseNotes(service), buildValidateCaseNotesMiddleware()];
}

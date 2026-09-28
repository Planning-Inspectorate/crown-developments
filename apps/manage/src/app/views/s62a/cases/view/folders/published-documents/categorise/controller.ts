import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type {
	DocumentCategorisationHandler,
	CategorisationHandlerRequestBody
} from '../../util/document-categorisation-handler.ts';
import { DOCUMENT_CATEGORIES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export function buildHandleCategoriseSelection(categoriser: DocumentCategorisationHandler) {
	return async (req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>, res: Response) => {
		await categoriser.handleSelection(req, res);
	};
}

export function buildHandleSingleCategoriseSelection(categoriser: DocumentCategorisationHandler) {
	return (req: Request, res: Response) => {
		categoriser.handleSingleSelection(req, res);
	};
}

export function buildCategoriseFileView(categoriser: DocumentCategorisationHandler) {
	return async (req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>, res: Response) => {
		await categoriser.renderCategorisation(req, res, DOCUMENT_CATEGORIES);
	};
}

export function buildCategoriseFileController(categoriser: DocumentCategorisationHandler) {
	return async (req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>, res: Response) => {
		await categoriser.executeRecategorise(req, res, DOCUMENT_CATEGORIES);
	};
}

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { DocumentPublisher, PublishRequestBody } from './document-publisher.ts';
import { DOCUMENT_CATEGORIES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export function buildHandlePublishSelection(publisher: DocumentPublisher) {
	return async (req: Request<ParamsDictionary, unknown, PublishRequestBody>, res: Response) => {
		await publisher.handleSelection(req, res);
	};
}

export function buildHandleSinglePublishSelection(publisher: DocumentPublisher) {
	return (req: Request, res: Response) => {
		publisher.handleSingleSelection(req, res);
	};
}

export function buildPublishFileView(publisher: DocumentPublisher) {
	return async (req: Request<ParamsDictionary, unknown, PublishRequestBody>, res: Response) => {
		await publisher.renderCategorisation(req, res, DOCUMENT_CATEGORIES);
	};
}

export function buildPublishFileController(publisher: DocumentPublisher) {
	return async (req: Request<ParamsDictionary, unknown, PublishRequestBody>, res: Response) => {
		await publisher.executePublish(req, res, DOCUMENT_CATEGORIES);
	};
}

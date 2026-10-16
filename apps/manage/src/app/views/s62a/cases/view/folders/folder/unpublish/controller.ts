import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { DocumentUnpublisher, UnpublishRequestBody } from '../../util/document-unpublisher.ts';

export function buildHandleSingleUnpublishSelection(unpublisher: DocumentUnpublisher) {
	return (req: Request, res: Response) => {
		unpublisher.handleSingleSelection(req, res);
	};
}

export function buildUnpublishFileView(unpublisher: DocumentUnpublisher) {
	return async (req: Request<ParamsDictionary, unknown, UnpublishRequestBody>, res: Response) => {
		await unpublisher.renderConfirmation(req, res);
	};
}

export function buildUnpublishFileController(unpublisher: DocumentUnpublisher) {
	return async (req: Request<ParamsDictionary, unknown, UnpublishRequestBody>, res: Response) => {
		await unpublisher.executeUnpublish(req, res);
	};
}

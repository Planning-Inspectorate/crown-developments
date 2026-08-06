import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { DocumentDeleter } from './document-deleter.ts';

interface DeleteRequestBody {
	selectedFiles: string | string[];
	returnUrl?: string;
}

export function buildHandleDeleteSelection(deleter: DocumentDeleter) {
	return (req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) => {
		deleter.handleSelection(req, res);
	};
}

export function buildHandleSingleDeleteSelection(deleter: DocumentDeleter) {
	return (req: Request, res: Response) => {
		deleter.handleSingleSelection(req, res);
	};
}

export function buildDeleteFileView(deleter: DocumentDeleter) {
	return async (req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) => {
		await deleter.renderConfirmation(req, res);
	};
}

export function buildDeleteFileController(deleter: DocumentDeleter) {
	return async (req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) => {
		await deleter.executeDelete(req, res);
	};
}

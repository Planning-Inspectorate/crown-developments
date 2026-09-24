import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { DocumentPublisher, PublishRequestBody } from './document-publisher.ts';

export function buildHandlePublishSelection(publisher: DocumentPublisher) {
	return (req: Request<ParamsDictionary, unknown, PublishRequestBody>, res: Response) => {
		publisher.handleSelection(req, res);
	};
}

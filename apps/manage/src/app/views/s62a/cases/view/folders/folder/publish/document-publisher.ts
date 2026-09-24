import type { ManageService } from '#service';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';

export interface PublishRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
}

/**
 * Class to handle publishing of documents.
 *
 * Currently only does error handling and redirecting. More functions will be added
 * in upcoming tickets.
 */
export class DocumentPublisher {
	service: ManageService;
	constructor(service: ManageService) {
		this.service = service;
	}

	/**
	 * Validates, saves IDs to the session, and redirects to the GET confirmation view.
	 */
	public handleSelection(req: Request<ParamsDictionary, unknown, PublishRequestBody>, res: Response) {
		const selectedFiles = req.body?.selectedFiles;
		const id = getStringParam(req.params, 'id');
		const safeReturnUrl = this.getSafeReturnUrl(req);

		const documentIds = this.extractDocumentIds(selectedFiles);

		if (!documentIds.length) {
			addSessionData(req, id, { filesErrors: [{ text: 'Select file(s) to publish', href: '#' }] }, 'folder');
			return res.redirect(safeReturnUrl);
		}

		req.session.publishFileIds = documentIds;
		return res.redirect(isValidRedirectUri(req.originalUrl) ? req.originalUrl : '/');
	}

	/**
	 * Normalises the passed Ids into an array of strings
	 */
	private extractDocumentIds(rawIds: string | string[] | undefined): string[] {
		const values = Array.isArray(rawIds) ? rawIds : [rawIds];
		return values.filter((id): id is string => typeof id === 'string' && id.length > 0);
	}

	/**
	 * Grabs the safe URL to return to
	 */
	private getSafeReturnUrl(req: Request<ParamsDictionary, unknown, PublishRequestBody>): string {
		const returnUrl = typeof req.body?.returnUrl === 'string' ? req.body.returnUrl : '';
		const fallbackUrl = req.originalUrl.split('/publish/documents')[0];

		if (isValidRedirectUri(returnUrl)) {
			return returnUrl;
		}
		return isValidRedirectUri(fallbackUrl) ? fallbackUrl : '/';
	}
}

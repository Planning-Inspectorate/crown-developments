import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

export interface BaseRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
}

export type DocumentSessionKey = 'deleteFilesIds' | 'unpublishFileIds' | 'publishFileIds';

/**
 * Abstract base class to handle common boilerplate for document actions
 * (e.g., Delete, Unpublish, Categorise, Publish).
 *
 * These actions share near identical workflows.
 */
export abstract class BaseDocumentAction {
	protected service: ManageService;

	protected abstract sessionKey: DocumentSessionKey;
	protected abstract actionName: string;
	protected abstract emptySelectionMessage: string;

	constructor(service: ManageService) {
		this.service = service;
	}

	/**
	 * Validates, saves IDs to the session, and redirects to the GET confirmation view.
	 */
	public handleSelection(
		req: Request<ParamsDictionary, unknown, BaseRequestBody>,
		res: Response
	): void | Response | Promise<void | Response> {
		const selectedFiles = req.body?.selectedFiles;
		const id = getStringParam(req.params, 'id');
		const safeReturnUrl = this.getSafeReturnUrl(req);

		const documentIds = this.extractDocumentIds(selectedFiles);

		if (!documentIds.length) {
			addSessionData(req, id, { filesErrors: [{ text: this.emptySelectionMessage, href: '#' }] }, 'folder');
			return res.redirect(safeReturnUrl);
		}

		req.session[this.sessionKey] = documentIds;
		return res.redirect(isValidRedirectUri(req.originalUrl) ? req.originalUrl : '/');
	}

	/**
	 * Acts as a middleman, as a single in-line action comes from a GET href.
	 * Attaches the document to the session the same as the PRG and redirects.
	 */
	public handleSingleSelection(req: Request, res: Response): void | Response {
		const documentId = getStringParam(req.params, 'documentId');

		req.session[this.sessionKey] = [documentId];

		const basePath = req.originalUrl.split(`/${this.actionName}/${documentId}`)[0];
		const redirectUrl = `${basePath}/${this.actionName}/documents/confirmation`;

		return res.redirect(isValidRedirectUri(redirectUrl) ? redirectUrl : '/');
	}

	/**
	 * Normalises the passed Ids into an array of strings.
	 */
	protected extractDocumentIds(rawIds: string | string[] | undefined): string[] {
		const values = Array.isArray(rawIds) ? rawIds : [rawIds];
		return values.filter((id): id is string => typeof id === 'string' && id.length > 0);
	}

	/**
	 * Grabs the data associated with the documents.
	 * Child classes can pass `extraSelectFields` to retrieve specific relations.
	 */
	protected async getDocumentsContext<T extends Prisma.DocumentSelect>(documentIds: string[], extraSelectFields?: T) {
		const documents = await this.service.db.document.findMany({
			select: {
				id: true,
				fileName: true,
				...extraSelectFields
			},
			where: { id: { in: documentIds } }
		});

		if (!documents || !documents.length) {
			throw new Error(`No documents found for provided ids`);
		}

		return { documents };
	}

	/**
	 * Grabs the safe URL to return to.
	 */
	protected getSafeReturnUrl(req: Request<ParamsDictionary, unknown, BaseRequestBody>): string {
		const returnUrl = typeof req.body?.returnUrl === 'string' ? req.body.returnUrl : '';
		const fallbackUrl = req.originalUrl.split(`/${this.actionName}/documents`)[0];

		if (isValidRedirectUri(returnUrl)) {
			return returnUrl;
		}
		return isValidRedirectUri(fallbackUrl) ? fallbackUrl : '/';
	}
}

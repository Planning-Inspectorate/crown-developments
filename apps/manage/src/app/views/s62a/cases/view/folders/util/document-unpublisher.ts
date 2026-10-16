import type { ManageService } from '#service';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import { BaseDocumentAction, type DocumentSessionKey } from './base-document-action.ts';

export interface UnpublishRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
}

/**
 * Class to handle unpublishing documents that were previously published.
 */
export class DocumentUnpublisher extends BaseDocumentAction {
	protected sessionKey: DocumentSessionKey = 'unpublishFileIds';
	protected actionName = 'unpublish';
	protected emptySelectionMessage = 'Select file(s) to unpublish';

	constructor(service: ManageService) {
		super(service);
	}

	/**
	 * Reads the document IDs from the session instead of a POST body.
	 */
	public async renderConfirmation(req: Request<ParamsDictionary, unknown, UnpublishRequestBody>, res: Response) {
		const documentIds = this.extractDocumentIds(req.session[this.sessionKey]);
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const unpublishUrl = req.originalUrl.split('/confirmation')[0];

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await this.getDocumentsContext(documentIds);
			const documents = Array.isArray(context?.documents) ? context.documents : [];

			return res.render('views/s62a/cases/view/folders/util/unpublish-confirmation.njk', {
				pageHeading: 'Unpublish selected documents',
				backLinkUrl: safeReturnUrl,
				returnUrl: safeReturnUrl,
				documents,
				unpublishUrl: isValidRedirectUri(unpublishUrl) ? unpublishUrl : '/'
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger: this.service.logger,
				message: 'fetching documents for unpublish confirmation',
				logParams: { documentIds }
			});
		}
	}

	/**
	 * Unpublishes a document, setting its publishDate to null and disconnecting it's categoryId
	 */
	public async executeUnpublish(req: Request<ParamsDictionary, unknown, UnpublishRequestBody>, res: Response) {
		const id = getStringParam(req.params, 'id');
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const documentIds = this.extractDocumentIds(req.session[this.sessionKey]);

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await this.getDocumentsContext(documentIds);

			await this.service.db.document.updateMany({
				where: { id: { in: documentIds } },
				data: { publishDate: null, categoryId: null }
			});

			addSessionData(req, id, { filesUnpublished: context.documents.length }, 'folder');

			delete req.session[this.sessionKey];

			return res.redirect(safeReturnUrl);
		} catch (error) {
			this.service.logger.error({ error, documentIds }, 'Failed to unpublish documents');
			const unpublishUrl = req.originalUrl.split('/confirmation')[0];

			return res.render('views/s62a/cases/view/folders/util/unpublish-confirmation.njk', {
				pageHeading: 'Unpublish selected documents',
				backLinkUrl: safeReturnUrl,
				returnUrl: safeReturnUrl,
				documents: [],
				unpublishUrl: isValidRedirectUri(unpublishUrl) ? unpublishUrl : '/',
				errorSummary: [{ text: 'Failed to unpublish documents, please try again.' }]
			});
		}
	}
}

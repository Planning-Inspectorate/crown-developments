import type { ManageService } from '#service';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import type { DOCUMENT_CATEGORIES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { BaseDocumentAction, type DocumentSessionKey } from './base-document-action.ts';

export interface CategorisationHandlerRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
	documentCategory?: string;
}

/**
 * Class to handle publishing / categorising of documents.
 */
export class DocumentCategorisationHandler extends BaseDocumentAction {
	protected sessionKey: DocumentSessionKey = 'publishFileIds';
	protected actionName: string;
	protected emptySelectionMessage: string;

	type: 'publish' | 'categorise';

	constructor(service: ManageService, type: 'publish' | 'categorise') {
		super(service);
		this.type = type;

		// Dynamically set properties required by the base class
		this.actionName = type;
		this.emptySelectionMessage = `Select file(s) to ${type}`;
	}

	/**
	 * Overrides the base handleSelection because 'publish' requires an
	 * async database check before allowing the IDs to be saved to the session.
	 */
	public async handleSelection(
		req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>,
		res: Response
	) {
		const id = getStringParam(req.params, 'id');
		const documentIds = this.extractDocumentIds(req.body?.selectedFiles);
		const safeReturnUrl = this.getSafeReturnUrl(req);

		if (!documentIds.length) {
			addSessionData(req, id, { filesErrors: [{ text: this.emptySelectionMessage, href: '#' }] }, 'folder');
			return res.redirect(safeReturnUrl);
		}

		const atLeastOnePublished = this.type === 'publish' && (await this.checkPublishStatus(documentIds));

		if (atLeastOnePublished) {
			addSessionData(
				req,
				id,
				{ filesErrors: [{ text: 'The selected files are already published', href: '#' }] },
				'folder'
			);
			return res.redirect(safeReturnUrl);
		}

		req.session[this.sessionKey] = documentIds;
		return res.redirect(isValidRedirectUri(req.originalUrl) ? req.originalUrl : '/');
	}

	/**
	 * Renders categorisation page grabbing document ids from session
	 */
	public async renderCategorisation(
		req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES
	) {
		return this.renderCategorisationView(req, res, categories);
	}

	/**
	 * Publishes the documents by setting the categoryId and publishDate to now.
	 */
	public async executePublish(
		req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES
	) {
		const id = getStringParam(req.params, 'id');
		const documentIds = this.extractDocumentIds(req.session[this.sessionKey]);
		const safeReturnUrl = this.getSafeReturnUrl(req);

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		const categoryId = req.body.documentCategory;

		if (!categoryId) {
			return this.renderCategorisationView(req, res, categories, [
				{ text: 'Select a category', href: '#documentCategory' }
			]);
		}

		try {
			const atLeastOnePublished = await this.checkPublishStatus(documentIds);
			if (atLeastOnePublished) {
				throw new Error('Files are already published.');
			}

			const result = await this.service.db.document.updateMany({
				where: { id: { in: documentIds } },
				data: {
					publishDate: new Date(),
					categoryId: categoryId
				}
			});

			addSessionData(req, id, { filesPublished: result.count }, 'folder');
			delete req.session[this.sessionKey];

			return res.redirect(safeReturnUrl);
		} catch (error) {
			this.service.logger.error({ error, documentIds }, 'Failed to publish documents');
			return this.renderCategorisationView(req, res, categories, [
				{ text: 'Failed to publish documents, please try again.', href: '#' }
			]);
		}
	}

	/**
	 * Re-categorises published documents category
	 */
	public async executeRecategorise(
		req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES
	) {
		const id = getStringParam(req.params, 'id');
		const documentIds = this.extractDocumentIds(req.session[this.sessionKey]);
		const safeReturnUrl = this.getSafeReturnUrl(req);

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		const categoryId = req.body.documentCategory;

		if (!categoryId) {
			return this.renderCategorisationView(req, res, categories, [
				{ text: 'Select a category', href: '#documentCategory' }
			]);
		}

		try {
			const result = await this.service.db.document.updateMany({
				where: { id: { in: documentIds } },
				data: {
					categoryId: categoryId
				}
			});

			addSessionData(req, id, { filesRecategorised: { count: result.count, categoryId: categoryId } }, 'folder');
			delete req.session[this.sessionKey];

			return res.redirect(safeReturnUrl);
		} catch (error) {
			this.service.logger.error({ error, documentIds }, 'Failed to re-categorise documents');
			return this.renderCategorisationView(req, res, categories, [
				{ text: 'Failed to re-categorise documents, please try again.', href: '#' }
			]);
		}
	}

	/**
	 * Reusable method to fetch context and render the categorisation Nunjucks view.
	 */
	private async renderCategorisationView(
		req: Request<ParamsDictionary, unknown, CategorisationHandlerRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES,
		errorSummary?: Array<{ text: string; href: string }>
	) {
		const documentIds = this.extractDocumentIds(req.session[this.sessionKey]);
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const actionUrl = req.originalUrl.split('/confirmation')[0];

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			// Request the extra relational fields unique to the categorisation context
			const context = await this.getDocumentsContext(documentIds, {
				S62aCase: { select: { reference: true } },
				publishDate: true
			});
			const documents = Array.isArray(context?.documents) ? context.documents : [];

			return res.render('views/s62a/cases/view/folders/util/categorisation.njk', {
				pageHeading: 'Categorise selected documents',
				backLinkUrl: safeReturnUrl,
				returnUrl: safeReturnUrl,
				documents,
				actionUrl: isValidRedirectUri(actionUrl) ? actionUrl : '/',
				categories,
				reference: documents[0]?.S62aCase?.reference,
				errorSummary,
				isPublish: this.type === 'publish'
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger: this.service.logger,
				message: 'fetching documents for publish categorisation',
				logParams: { documentIds }
			});
		}
	}

	/**
	 * Checks to make sure that none of the documents to publish are already published.
	 */
	private async checkPublishStatus(documentIds: string[]) {
		const documentsContext = await this.getDocumentsContext(documentIds, { publishDate: true });
		return documentsContext.documents.some((document) => document.publishDate);
	}
}

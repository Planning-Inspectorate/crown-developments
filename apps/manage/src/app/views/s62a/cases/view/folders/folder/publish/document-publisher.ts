import type { ManageService } from '#service';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import type { DOCUMENT_CATEGORIES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export interface PublishRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
	documentCategory?: string;
}

/**
 * Class to handle publishing of documents.
 */
export class DocumentPublisher {
	service: ManageService;
	constructor(service: ManageService) {
		this.service = service;
	}

	/**
	 * Validates, saves IDs to the session, and redirects to the GET confirmation view.
	 */
	public async handleSelection(req: Request<ParamsDictionary, unknown, PublishRequestBody>, res: Response) {
		const id = getStringParam(req.params, 'id');
		const documentIds = this.extractDocumentIds(req.body?.selectedFiles);
		const safeReturnUrl = this.getSafeReturnUrl(req);

		if (!documentIds.length) {
			addSessionData(req, id, { filesErrors: [{ text: 'Select file(s) to publish', href: '#' }] }, 'folder');
			return res.redirect(safeReturnUrl);
		}

		const atLeastOnePublished = await this.checkPublishStatus(documentIds);

		if (atLeastOnePublished) {
			addSessionData(
				req,
				id,
				{ filesErrors: [{ text: 'The selected files are already published', href: '#' }] },
				'folder'
			);
			return res.redirect(safeReturnUrl);
		}

		req.session.publishFileIds = documentIds;
		return res.redirect(isValidRedirectUri(req.originalUrl) ? req.originalUrl : '/');
	}

	/**
	 * Acts as a middleman, as a single in-line publish comes from a GET href
	 * So we use this middleman to attach the document to the session the same
	 * as the PRG and redirect.
	 */
	public handleSingleSelection(req: Request, res: Response) {
		const documentId = getStringParam(req.params, 'documentId');

		req.session.publishFileIds = [documentId];

		const basePath = req.originalUrl.split(`/publish/${documentId}`)[0];
		const redirectUrl = `${basePath}/publish/documents/confirmation`;

		return res.redirect(isValidRedirectUri(redirectUrl) ? redirectUrl : '/');
	}

	/**
	 * Renders categorisation page grabbing document ids from session
	 */
	public async renderCategorisation(
		req: Request<ParamsDictionary, unknown, PublishRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES
	) {
		return this.renderCategorisationView(req, res, categories);
	}

	/**
	 * Publishes the documents by setting the categoryId and publishDate to now.
	 */
	public async executePublish(
		req: Request<ParamsDictionary, unknown, PublishRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES
	) {
		const id = getStringParam(req.params, 'id');
		const documentIds = this.extractDocumentIds(req.session.publishFileIds);
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
			delete req.session.publishFileIds;

			return res.redirect(safeReturnUrl);
		} catch (error) {
			this.service.logger.error({ error, documentIds }, 'Failed to publish documents');
			return this.renderCategorisationView(req, res, categories, [
				{ text: 'Failed to publish documents, please try again.', href: '#' }
			]);
		}
	}

	/**
	 * Reusable method to fetch context and render the categorisation Nunjucks view.
	 * Handles both the initial GET request and POST validation/database failures.
	 */
	private async renderCategorisationView(
		req: Request<ParamsDictionary, unknown, PublishRequestBody>,
		res: Response,
		categories: typeof DOCUMENT_CATEGORIES,
		errorSummary?: Array<{ text: string; href: string }>
	) {
		const documentIds = this.extractDocumentIds(req.session.publishFileIds);
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const publishUrl = req.originalUrl.split('/confirmation')[0];

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await this.getDocumentsContext(documentIds);
			const documents = Array.isArray(context?.documents) ? context.documents : [];

			return res.render('views/s62a/cases/view/folders/folder/publish/categorisation.njk', {
				pageHeading: 'Categorise selected documents',
				backLinkUrl: safeReturnUrl,
				returnUrl: safeReturnUrl,
				documents,
				publishUrl: isValidRedirectUri(publishUrl) ? publishUrl : '/',
				categories,
				reference: documents[0]?.S62aCase?.reference,
				errorSummary
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
	 * Grabs the data associated with the documents to be published.
	 */
	private async getDocumentsContext(documentIds: string[]) {
		const documents = await this.service.db.document.findMany({
			select: {
				id: true,
				fileName: true,
				S62aCase: { select: { reference: true } },
				publishDate: true
			},
			where: { id: { in: documentIds } }
		});

		if (!documents || !documents.length) {
			throw new Error(`No documents found for provided ids`);
		}

		return { documents };
	}

	/**
	 * Normalises the passed ids into an array of strings
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

	/**
	 * Checks to make sure that none of the documents to publish are already
	 * published.
	 */
	private async checkPublishStatus(documentIds: string[]) {
		const documentsContext = await this.getDocumentsContext(documentIds);
		return documentsContext.documents.some((document) => document.publishDate);
	}
}

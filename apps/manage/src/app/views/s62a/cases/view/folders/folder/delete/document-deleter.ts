import type { ManageService } from '#service';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';

export interface DeleteRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
}

/**
 * Class to handle the soft deleting of documents within a folder in S62A
 */
export class DocumentDeleter {
	service: ManageService;
	constructor(service: ManageService) {
		this.service = service;
	}

	/**
	 * Validates, saves IDs to the session, and redirects to the GET confirmation view.
	 */
	public handleSelection(req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) {
		const selectedFiles = req.body?.selectedFiles;
		const id = getStringParam(req.params, 'id');
		const safeReturnUrl = this.getSafeReturnUrl(req);

		const documentIds = this.extractDocumentIds(selectedFiles);

		if (!documentIds.length) {
			addSessionData(req, id, { filesErrors: [{ text: 'Select file(s) to delete', href: '#' }] }, 'folder');
			return res.redirect(safeReturnUrl);
		}

		req.session.deleteFilesIds = documentIds;
		return res.redirect(isValidRedirectUri(req.originalUrl) ? req.originalUrl : '/');
	}

	/**
	 * Reads the document IDs from the session instead of a POST body.
	 */
	public async renderConfirmation(req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) {
		const documentIds = this.extractDocumentIds(req.session.deleteFilesIds);
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const deleteUrl = req.originalUrl.split('/confirmation')[0];

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await this.getDocumentsContext(documentIds);
			const documents = Array.isArray(context?.documents) ? context.documents : [];

			return res.render('views/s62a/cases/view/folders/folder/delete/confirmation.njk', {
				pageHeading: this.getDeleteHeading(documents.length),
				backLinkUrl: safeReturnUrl,
				returnUrl: safeReturnUrl,
				documents,
				deleteUrl: isValidRedirectUri(deleteUrl) ? deleteUrl : '/'
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger: this.service.logger,
				message: 'fetching documents for delete confirmation',
				logParams: { documentIds }
			});
		}
	}

	/**
	 * "Soft" deletes the document by setting the deletedAt date to now.
	 */
	public async executeDelete(req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) {
		const id = getStringParam(req.params, 'id');
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const documentIds = this.extractDocumentIds(req.session.deleteFilesIds);

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await this.getDocumentsContext(documentIds);

			await this.service.db.document.updateMany({
				where: { id: { in: documentIds } },
				data: { deletedAt: new Date() }
			});

			addSessionData(req, id, { filesDeleted: context.documents.length }, 'folder');
			delete req.session.deleteFilesIds;

			return res.redirect(safeReturnUrl);
		} catch (error) {
			this.service.logger.error({ error, documentIds }, 'Failed to delete documents');
			const deleteUrl = req.originalUrl.split('/confirmation')[0];

			return res.render('views/s62a/cases/view/folders/folder/delete/confirmation.njk', {
				pageHeading: this.getDeleteHeading(documentIds.length),
				backLinkUrl: safeReturnUrl,
				returnUrl: safeReturnUrl,
				documents: [],
				deleteUrl: isValidRedirectUri(deleteUrl) ? deleteUrl : '/',
				errorSummary: [{ text: 'Failed to delete documents, please try again.' }]
			});
		}
	}

	/**
	 * Acts as a middleman, as a single in-line delete comes from a GET href
	 * So we use this middleman to attach the document to the session the same
	 * as the PRG and redirect.
	 */
	public handleSingleSelection(req: Request, res: Response) {
		const documentId = getStringParam(req.params, 'documentId');

		req.session.deleteFilesIds = [documentId];

		const basePath = req.originalUrl.split(`/delete/${documentId}`)[0];
		const redirectUrl = `${basePath}/delete/documents/confirmation`;

		return res.redirect(isValidRedirectUri(redirectUrl) ? redirectUrl : '/');
	}

	/**
	 * Normalises the passed Ids into an array of strings
	 */
	private extractDocumentIds(rawIds: string | string[] | undefined): string[] {
		const values = Array.isArray(rawIds) ? rawIds : [rawIds];
		return values.filter((id): id is string => typeof id === 'string' && id.length > 0);
	}

	/**
	 * Grabs the data associated with the documents to be deleted.
	 */
	private async getDocumentsContext(documentIds: string[]) {
		const documents = await this.service.db.document.findMany({
			select: {
				id: true,
				fileName: true,
				s62aCaseId: true,
				deletedAt: true,
				Folder: {
					select: { id: true, displayName: true }
				}
			},
			where: { id: { in: documentIds } }
		});

		if (!documents || !documents.length) {
			throw new Error(`No documents found for provided ids`);
		}

		return { documents };
	}

	/**
	 * Grabs the safe URL to return to
	 */
	private getSafeReturnUrl(req: Request<ParamsDictionary, unknown, DeleteRequestBody>): string {
		const returnUrl = typeof req.body?.returnUrl === 'string' ? req.body.returnUrl : '';
		const fallbackUrl = req.originalUrl.split('/delete/documents')[0];

		if (isValidRedirectUri(returnUrl)) {
			return returnUrl;
		}
		return isValidRedirectUri(fallbackUrl) ? fallbackUrl : '/';
	}

	/**
	 * The heading to display once the deletion has occured.
	 */
	private getDeleteHeading(fileCount: number): string {
		if (fileCount === 0) return 'Delete files';
		return fileCount === 1 ? 'Delete 1 file' : `Delete ${fileCount} files`;
	}
}

import type { ManageService } from '#service';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import { FILE_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/files.ts';
import { recordS62aFileAudit } from '../../../../audit/files.ts';
import { BaseDocumentAction, type DocumentSessionKey } from '../../util/base-document-action.ts';

export interface DeleteRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
}

/**
 * Class to handle the soft deleting of documents within a folder in S62A
 */
export class DocumentDeleter extends BaseDocumentAction {
	protected sessionKey: DocumentSessionKey = 'deleteFilesIds';
	protected actionName = 'delete';
	protected emptySelectionMessage = 'Select file(s) to delete';

	constructor(service: ManageService) {
		super(service);
	}

	/**
	 * Reads the document IDs from the session instead of a POST body.
	 */
	public async renderConfirmation(req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) {
		const documentIds = this.extractDocumentIds(req.session[this.sessionKey]);
		const safeReturnUrl = this.getSafeReturnUrl(req);
		const deleteUrl = req.originalUrl.split('/confirmation')[0];

		if (!documentIds.length) {
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await this.getDocumentsContext(documentIds, {
				s62aCaseId: true,
				deletedAt: true,
				Folder: {
					select: { id: true, displayName: true }
				}
			});
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
	 * "Soft" deletes the document by setting the deletedAt date to now,
	 * then records the removal in the case history.
	 */
	public async executeDelete(req: Request<ParamsDictionary, unknown, DeleteRequestBody>, res: Response) {
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
				data: { deletedAt: new Date() }
			});

			await recordS62aFileAudit(
				this.service,
				req,
				id,
				context.documents.map((document) => document.fileName),
				FILE_AUDIT_ACTIONS.deleted
			);

			addSessionData(req, id, { filesDeleted: context.documents.length }, 'folder');

			delete req.session[this.sessionKey];

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
	 * The heading to display once the deletion has occured.
	 */
	private getDeleteHeading(fileCount: number): string {
		if (fileCount === 0) return 'Delete files';
		return fileCount === 1 ? 'Delete 1 file' : `Delete ${fileCount} files`;
	}
}

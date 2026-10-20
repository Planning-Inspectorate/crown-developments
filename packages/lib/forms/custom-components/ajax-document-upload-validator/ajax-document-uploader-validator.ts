import { body } from 'express-validator';
import { readSessionData } from '@pins/crowndev-lib/util/session.ts';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { getStringParam } from '../../../util/params.ts';
import { getFilesSessionId } from '../multi-file-uploader/files-session-id.ts';
import type { Request } from 'express';

/**
 * Checks session for any uploaded files, needed because we cannot check the body
 * as unlike other syncronous upload components, some use ajax so the body
 * is unpopulated.
 */
export class AjaxDocumentUploadValidator extends BaseValidator {
	public fieldName: string;
	public errorMessage: string;

	constructor(fieldName: string, errorMessage = 'Upload an attachment') {
		super();
		this.fieldName = fieldName;
		this.errorMessage = errorMessage;
	}

	validate() {
		return [
			body(this.fieldName).custom((_, { req }) => {
				const params = req.params as Record<string, unknown>;
				const id = getFilesSessionId(params);
				const urlQuestionSlug = getStringParam(params, 'question');

				const sessionQuestionData = readSessionData(
					req as Request,
					id,
					urlQuestionSlug,
					{ uploadedFiles: [] },
					'files'
				);

				const uploadedFiles = sessionQuestionData !== false ? sessionQuestionData.uploadedFiles : [];

				if (!uploadedFiles || uploadedFiles.length === 0) {
					throw new Error(this.errorMessage);
				}

				return true;
			})
		];
	}
}

export default AjaxDocumentUploadValidator;

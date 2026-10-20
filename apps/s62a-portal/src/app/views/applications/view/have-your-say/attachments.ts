import type { S62APortalService } from '#service';
import MultiFileUploadQuestion, {
	type DraftFile,
	type UploadErrorsSession
} from '@pins/crowndev-lib/forms/custom-components/multi-file-uploader/question.ts';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import { getOptionalStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { RepresentationDocumentsUploader } from '@pins/crowndev-lib/util/representation-document-uploader.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import type { ValidationConfig } from '@pins/crowndev-lib/validators/file-validator.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { Journey } from '@planning-inspectorate/dynamic-forms';
import type { Handler, Request, Response } from 'express';
import multer from 'multer';

export const MAXIMUM_ATTACHMENTS_PER_UPLOAD = 3;

/**
 * The FO error messages, where they differ from the back office ones
 */
export const ATTACHMENT_ERRORS = {
	noAttachment: 'Select an attachment to upload',
	wrongType: 'The selected file must be a PDF, PNG, JPG, JPEG, TIF, TIFF, DOC, DOCX, XLS or XLSX',
	tooLarge: 'The selected file must be smaller than 20MB',
	tooManyFiles: `You can only upload ${MAXIMUM_ATTACHMENTS_PER_UPLOAD} attachments at a time`,
	totalTooLarge: 'The total size of your attachments must be under 1GB',
	fileTypeUndetermined: 'The selected file could not be uploaded – try again',
	passwordProtected: 'The selected file must not be password protected',
	duplicateName: 'An attachment with this name has already been uploaded'
} as const;

export const ATTACHMENT_VALIDATION_CONFIG: ValidationConfig = {
	allowedExtensions: ALLOWED_EXTENSIONS,
	allowedMimeTypes: ALLOWED_MIME_TYPES,
	allowedExtensionsText: ALLOWED_EXTENSIONS_TEXT,
	maxFileSize: MAX_FILE_SIZE,
	totalUploadLimit: TOTAL_UPLOAD_LIMIT,
	fileNameRegex: FILE_NAMES_REGEX,
	maxFileNameLength: FILE_NAME_MAX_LENGTH,
	maxFilesPerUpload: MAXIMUM_ATTACHMENTS_PER_UPLOAD,
	messages: {
		wrongType: ATTACHMENT_ERRORS.wrongType,
		// a zip, or a file pretending to be another type, is the wrong type as far as the user is concerned
		zip: ATTACHMENT_ERRORS.wrongType,
		signatureMismatch: ATTACHMENT_ERRORS.wrongType,
		tooLarge: ATTACHMENT_ERRORS.tooLarge,
		tooManyFiles: ATTACHMENT_ERRORS.tooManyFiles,
		totalTooLarge: ATTACHMENT_ERRORS.totalTooLarge,
		fileTypeUndetermined: ATTACHMENT_ERRORS.fileTypeUndetermined,
		passwordProtected: ATTACHMENT_ERRORS.passwordProtected,
		duplicateName: ATTACHMENT_ERRORS.duplicateName
	}
};

/** The field the upload form sends files in, see multi-file-uploader/index.njk */
const FILES_FIELD = 'documents';

/** res.locals.uploadError, set by receiveAttachments when multer turns the upload down */
const UPLOAD_ERROR = 'uploadError';

/**
 * Reads the upload into memory. Multer stops reading at the size and number limits, so
 * those are reported as validation errors rather than failing the request.
 */
export function receiveAttachments(): Handler {
	const upload = multer({
		limits: { fileSize: MAX_FILE_SIZE, files: MAXIMUM_ATTACHMENTS_PER_UPLOAD }
	}).array(FILES_FIELD);

	return (req, res, next) => {
		upload(req, res, (error: unknown) => {
			if (error instanceof multer.MulterError) {
				res.locals[UPLOAD_ERROR] =
					error.code === 'LIMIT_FILE_SIZE' ? ATTACHMENT_ERRORS.tooLarge : ATTACHMENT_ERRORS.tooManyFiles;
				return next();
			}
			next(error);
		});
	};
}

/**
 * Uploads attachments to the blob store as drafts, against this session. They become part of
 * the representation when it's submitted.
 *
 * The upload component sends one file at a time with JavaScript, and expects JSON back.
 * Without JavaScript the form posts here, so we go back to the page, with any errors in the session.
 */
export function buildUploadAttachments(
	service: S62APortalService,
	uploader: RepresentationDocumentsUploader
): AsyncRequestHandler {
	return async (req, res) => {
		const upload = getUploadQuestion(req, res);
		if (!upload) {
			notFoundHandler(req, res);
			return;
		}
		// multer.array() gives an array, but check rather than trust the request
		const files: Express.Multer.File[] = Array.isArray(req.files) ? req.files : [];
		const multerError = res.locals[UPLOAD_ERROR] as string | undefined;

		let errors: string[];

		if (multerError) {
			errors = [multerError];
		} else if (files.length === 0) {
			errors = [ATTACHMENT_ERRORS.noAttachment];
		} else {
			const validationErrors = await uploader.validateUploadBatch(req.sessionID, files, ATTACHMENT_VALIDATION_CONFIG);
			errors = validationErrors.map((e) => e.text);
		}

		if (errors.length > 0) {
			sendUploadErrors(req, res, upload, errors);
			return;
		}

		const [uploaded] = await uploader.processAndDraftUploads(upload.applicationId, files, req.sessionID);

		await refreshSessionFiles(service, req, upload);

		if (!wantsJson(req)) {
			res.redirect(upload.url);
			return;
		}

		res.json({
			file: {
				id: uploaded.id,
				originalname: uploaded.fileName,
				filename: uploaded.id,
				size: files[0].size
			},
			success: {
				messageHtml: `<span class="moj-multi-file-upload__filename">${escapeHtml(uploaded.fileName)} (${formatBytes(files[0].size)})</span>`,
				messageText: `${uploaded.fileName} uploaded`
			}
		});
	};
}

/**
 * Removes a draft attachment. The Remove button sends the draft id as `delete`.
 */
export function buildRemoveAttachment(
	service: S62APortalService,
	uploader: RepresentationDocumentsUploader
): AsyncRequestHandler {
	return async (req, res) => {
		const upload = getUploadQuestion(req, res);

		if (!upload) {
			notFoundHandler(req, res);
			return;
		}

		const documentId = getOptionalStringParam(req.body as Record<string, unknown>, 'delete');

		// anything else can't be one of this session's drafts
		if (documentId && isValidUuidFormat(documentId)) {
			await uploader.deleteDraft(documentId, req.sessionID);
			await refreshSessionFiles(service, req, upload);
		}

		if (!wantsJson(req)) {
			res.redirect(upload.url);
			return;
		}

		res.json({ success: true });
	};
}

interface UploadQuestion {
	applicationId: string;
	/** the question's url segment, which session.files is keyed by */
	question: string;
	fieldName: string;
	/** the upload page */
	url: string;
}

/**
 * The upload question this request is for, or undefined if the url isn't an upload page
 */
function getUploadQuestion(req: Request, res: Response): UploadQuestion | undefined {
	const journey = res.locals.journey as Journey | undefined;
	const { applicationId, section, question } = getStringParams(req.params, ['applicationId', 'section', 'question']);
	const journeySection = journey?.getSection(section);
	const uploadQuestion = journey?.getQuestionByParams({ section, question });

	if (!journey || !journeySection || !(uploadQuestion instanceof MultiFileUploadQuestion)) {
		return undefined;
	}

	return {
		applicationId,
		question,
		fieldName: uploadQuestion.fieldName,
		url: journey.getCurrentQuestionUrl(journeySection.segment, uploadQuestion.fieldName)
	};
}

/**
 * The upload component asks for JSON. A form submitted without JavaScript asks for HTML.
 */
function wantsJson(req: Request): boolean {
	return req.accepts(['json', 'html']) === 'json';
}

function sendUploadErrors(req: Request, res: Response, upload: UploadQuestion, errors: string[]): void {
	const messages = [...new Set(errors)];

	if (wantsJson(req)) {
		res.json({ error: { message: messages.join(' ') } });
		return;
	}

	const session = req.session as unknown as UploadErrorsSession;

	session.errors = { [upload.fieldName]: { msg: messages[0] } };
	session.errorSummary = messages.map((text) => ({ text, href: `#${upload.fieldName}` }));

	res.redirect(upload.url);
}

/**
 * Lists this session's drafts where the upload question and its validator read them,
 * see MultiFileUploadQuestion.getDataToSave
 */
async function refreshSessionFiles(service: S62APortalService, req: Request, upload: UploadQuestion) {
	const drafts = await service.db.draftBlobRepresentationDocument.findMany({
		where: { sessionKey: req.sessionID }
	});

	const uploadedFiles: (DraftFile & { mimeType: string })[] = drafts.map((draft) => ({
		id: draft.id,
		itemId: draft.id,
		fileName: draft.fileName,
		mimeType: draft.mimeType,
		size: Number(draft.size)
	}));

	addSessionData(req, upload.applicationId, { [upload.question]: { uploadedFiles } }, 'files');
}

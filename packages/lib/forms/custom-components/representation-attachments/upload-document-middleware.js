import { getOptionalStringParam } from '../../../util/params.ts';

/** @typedef {Record<string, { uploadedFiles: Array<Object> }>} FileGroup */
/** @typedef {Record<string, FileGroup>} Files */
/** @typedef {Array<{ text: string, href: string }>} ErrorSummary */
/**
 * @typedef {Object} UploadDocumentSession
 * @property {Files} [files]
 * @property {ErrorSummary} [errorSummary]
 * @property {Record<string, string>} [errors]
 */
/**
 * @typedef {Object} UploadDocumentParams
 * @property {string} question
 */

/**
 * Middleware to handle upload document questions
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function uploadDocumentQuestion(req, res, next) {
	const session = /** @type {UploadDocumentSession} */ (/** @type {unknown} */ (req.session));
	const params = /** @type {UploadDocumentParams & Record<string, string>} */ (req.params);

	const idKey = 'representationRef' in params ? 'representationRef' : 'id' in params ? 'id' : 'applicationId';
	const id = getOptionalStringParam(params, idKey);

	const uploadDocumentQuestionUrls = ['select-attachments', 'attachments', 'upload-request'];
	if (uploadDocumentQuestionUrls.includes(params.question)) {
		const { journey } = res.locals;
		const sectionParam = getOptionalStringParam(params, 'section');

		const section = journey.getSection(sectionParam);
		const question = journey.getQuestionByParams(params);

		if (!question || !section) {
			return res.redirect(journey.taskListUrl);
		}

		const hasSessionErrors = (session?.errorSummary?.length ?? 0) > 0 || Object.keys(session?.errors || {}).length > 0;

		const viewModel = hasSessionErrors
			? question.checkForValidationErrors(req, section, journey)
			: question.toViewModel({
					params,
					section,
					journey,
					customViewData: {
						id,
						currentUrl: req.originalUrl,
						files: session?.files
					}
				});
		if (session) {
			delete session.errors;
			delete session.errorSummary;
		}

		return question.renderAction(res, viewModel);
	}
	next();
}

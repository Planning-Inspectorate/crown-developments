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
 * @param {import('express').Request & { session: UploadDocumentSession, params: UploadDocumentParams }} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function uploadDocumentQuestion(req, res, next) {
	const idKey = 'representationRef' in req.params ? 'representationRef' : 'id' in req.params ? 'id' : 'applicationId';
	const id = getOptionalStringParam(req.params, idKey);

	const uploadDocumentQuestionUrls = ['select-attachments', 'attachments', 'upload-request'];
	if (uploadDocumentQuestionUrls.includes(req.params.question)) {
		const { journey } = res.locals;
		const sectionParam = getOptionalStringParam(req.params, 'section');

		const section = journey.getSection(sectionParam);
		const question = journey.getQuestionByParams(req.params);

		if (!question || !section) {
			return res.redirect(journey.taskListUrl);
		}

		const hasSessionErrors =
			(req.session?.errorSummary?.length ?? 0) > 0 || Object.keys(req.session?.errors || {}).length > 0;

		const viewModel = hasSessionErrors
			? question.checkForValidationErrors(req, section, journey)
			: question.toViewModel({
					params: req.params,
					section,
					journey,
					customViewData: {
						id,
						currentUrl: req.originalUrl,
						files: req.session?.files
					}
				});
		if (req.session) {
			delete req.session.errors;
			delete req.session.errorSummary;
		}

		return question.renderAction(res, viewModel);
	}
	next();
}

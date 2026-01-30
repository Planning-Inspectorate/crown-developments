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
	const uploadDocumentQuestionUrls = ['select-attachments', 'upload-request'];
	if (uploadDocumentQuestionUrls.includes(req.params.question)) {
		const { journey } = res.locals;

		const section = journey.getSection(req.params.section);
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
						id: req.params.representationRef || req.params.id || req.params.applicationId,
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

/**
 * Middleware to handle upload document questions
 * @param {import('express').Request} req
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

		const hasSessionErrors = req.session?.errorSummary?.length > 0 || Object.keys(req.session?.errors || {}).length > 0;

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

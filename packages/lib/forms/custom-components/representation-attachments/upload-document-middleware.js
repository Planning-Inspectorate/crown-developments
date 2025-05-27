export async function uploadDocumentQuestion(req, res, next) {
	if (req.params.question === 'select-attachments') {
		const { section, question } = req.params;
		const { journey } = res.locals;

		const sectionObj = journey.getSection(section);
		const questionObj = journey.getQuestionBySectionAndName(section, question);

		if (!questionObj || !sectionObj) {
			return res.redirect(journey.taskListUrl);
		}

		const hasSessionErrors = req.session?.errorSummary?.length > 0 || Object.keys(req.session?.errors || {}).length > 0;

		const viewModel = hasSessionErrors
			? questionObj.checkForValidationErrors(req, sectionObj, journey)
			: questionObj.prepQuestionForRendering(sectionObj, journey, {
					id: req.params.id || req.params.applicationId,
					currentUrl: req.originalUrl,
					files: req.session?.files
				});

		if (req.session) {
			delete req.session.errors;
			delete req.session.errorSummary;
		}

		return questionObj.renderAction(res, viewModel);
	}
	next();
}

export function buildSave(saveData, redirectToTaskListOnSuccess) {
	return async (req, res) => {
		const { section, question } = req.params;
		/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} */
		const journey = res.locals.journey;
		/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;

		const sectionObj = journey.getSection(section);
		const questionObj = journey.getQuestionBySectionAndName(section, question);

		if (!questionObj || !sectionObj) {
			return res.redirect(journey.taskListUrl);
		}

		try {
			const errorViewModel = questionObj.checkForValidationErrors(req, sectionObj, journey);
			if (errorViewModel) {
				return questionObj.renderAction(res, errorViewModel);
			}

			const data = await questionObj.getDataToSave(req, journeyResponse);

			await saveData({
				req,
				res,
				journeyId: journeyResponse.journeyId,
				referenceId: journeyResponse.referenceId,
				data
			});

			const saveViewModel = questionObj.checkForSavingErrors(req, sectionObj, journey);
			if (saveViewModel) {
				return questionObj.renderAction(res, saveViewModel);
			}
			if (redirectToTaskListOnSuccess) {
				return res.redirect(journey.taskListUrl);
			}
			return questionObj.handleNextQuestion(res, journey, sectionObj.segment, questionObj.fieldName);
		} catch (err) {
			const viewModel = questionObj.prepQuestionForRendering(sectionObj, journey, {
				id: req.params.representationRef || req.params.id || req.params.applicationId,
				currentUrl: req.originalUrl,
				files: req.session?.files,
				errorSummary: err.errorSummary ?? [{ text: err.toString(), href: '#' }]
			});
			return questionObj.renderAction(res, viewModel);
		}
	};
}

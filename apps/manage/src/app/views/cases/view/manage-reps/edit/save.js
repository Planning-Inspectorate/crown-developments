export function buildSave(saveData, redirectToTaskListOnSuccess) {
	return async (req, res) => {
		/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} */
		const journey = res.locals.journey;
		/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;

		const section = journey.getSection(req.params.section);
		const question = journey.getQuestionByParams(req.params);

		if (!question || !section) {
			return res.redirect(journey.taskListUrl);
		}

		let manageListQuestion;
		if (question.isInManageListSection) {
			// find parent question for the manage list
			manageListQuestion = journey.getQuestionByParams({ section: req.params.section, question: req.params.question });
			if (!manageListQuestion) {
				return res.redirect(journey.taskListUrl);
			}
		}

		try {
			const errorViewModel = question.checkForValidationErrors(req, section, journey);
			if (errorViewModel) {
				return question.renderAction(res, errorViewModel);
			}

			const data = await question.getDataToSave(req, journeyResponse);

			await saveData({
				req,
				res,
				journeyId: journeyResponse.journeyId,
				referenceId: journeyResponse.referenceId,
				data
			});

			const saveViewModel = question.checkForSavingErrors(req, section, journey);
			if (saveViewModel) {
				return question.renderAction(res, saveViewModel);
			}
			if (redirectToTaskListOnSuccess) {
				return res.redirect(journey.taskListUrl);
			}
			return journey.redirectToNextQuestion(res, {
				section: section.segment,
				question: question.fieldName
			});
		} catch (err) {
			const viewModel = question.toViewModel({
				params: req.params,
				manageListQuestion,
				section,
				journey,
				customViewData: {
					id: req.params.representationRef || req.params.id || req.params.applicationId,
					currentUrl: req.originalUrl,
					files: req.session?.files,
					errorSummary: err.errorSummary ?? [{ text: err.toString(), href: '#' }]
				}
			});
			return question.renderAction(res, viewModel);
		}
	};
}

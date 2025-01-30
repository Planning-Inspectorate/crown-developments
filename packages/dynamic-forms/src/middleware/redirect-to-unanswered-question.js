/**
 * @typedef {function(import('../section').Question, import('../journey/journey-response').JourneyResponse): boolean} ShouldDisplayCondition
 */

/**
 * Redirects to the first unanswered question in a journey, or to the task list if complete
 *
 * @param {ShouldDisplayCondition[]} [conditions]
 * @returns {import('express').Handler}
 */
export function redirectToUnansweredQuestion(conditions = []) {
	return (req, res, next) => {
		const { journeyResponse, journey } = res.locals;

		for (const section of journey.sections) {
			for (const question of section.questions) {
				const answer = journey.response?.answers[question.fieldName];

				const shouldSkip = conditions.some((condition) => condition(question, journeyResponse));
				const shouldDisplay = !question.shouldDisplay || question.shouldDisplay(journeyResponse);

				if (shouldSkip || !shouldDisplay) {
					continue;
				}

				// allow null or empty
				if (answer === undefined) {
					const url = journey.getCurrentQuestionUrl(section.segment, question.fieldName);
					if (req?.originalUrl?.endsWith(url)) {
						next();
						return;
					}
					return res.redirect(url);
				}
			}
		}
		return res.redirect(journey.taskListUrl);
	};
}

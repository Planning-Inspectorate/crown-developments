/**
 * @param {[((question: import('../section').Question, journeyResponse: import('../journey/journey-response').JourneyResponse) => boolean)]} conditions
 * @returns {import('express').Handler}
 */
export default (conditions) => (req, res, next) => {
	const { journeyResponse, journey } = res.locals;

	for (const section of journey.sections) {
		for (const question of section.questions) {
			const answer = journey.response?.answers[question.fieldName];

			const shouldSkip = conditions.some((condition) => condition(question, journeyResponse));
			const shouldDisplay = !question.shouldDisplay || question.shouldDisplay(journeyResponse);
			if (shouldSkip || !shouldDisplay) {
				continue;
			}

			if (['', undefined, null].includes(answer)) {
				return res.redirect(journey.getCurrentQuestionUrl(section.segment, question.fieldName));
			}
		}
	}
	next();
};

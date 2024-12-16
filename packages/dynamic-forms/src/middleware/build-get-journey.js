/**
 * @param {(req: import('express').Request, journeyResponse: import('../journey/journey-response.js').JourneyResponse) => import('../journey/journey.js').Journey} createJourney
 * @returns {import('express').Handler}
 */
export function buildGetJourney(createJourney) {
	return (req, res, next) => {
		if (!('journeyId' in res.locals.journeyResponse)) {
			throw new Error('no journey ID specified');
		}
		const { journeyId } = res.locals.journeyResponse;
		const journey = createJourney(req, res.locals.journeyResponse);
		if (journeyId !== journey.journeyId) {
			throw new Error('journey ID mismatch');
		}
		journey.setResponse(res.locals.journeyResponse);
		res.locals.journey = journey;
		next();
	};
}

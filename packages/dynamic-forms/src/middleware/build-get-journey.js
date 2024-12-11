/**
 * @param {(response: import('../journey/journey-response.js').JourneyResponse) => import('../journey/journey.js').Journey} createJourney
 * @returns {import('express').Handler}
 */
export function buildGetJourney(createJourney) {
	return (_, res, next) => {
		if (!('journeyId' in res.locals.journeyResponse)) {
			throw new Error('no journey ID specified');
		}
		const { journeyId } = res.locals.journeyResponse;
		const journey = createJourney(res.locals.journeyResponse);
		if (journeyId !== journey.journeyId) {
			throw new Error('journey ID mismatch');
		}
		journey.setResponse(res.locals.journeyResponse);
		res.locals.journey = journey;
		next();
	};
}

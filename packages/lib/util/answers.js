/**
 * Returns pagination parameters based on url query params
 *
 * @param {import('express').Response} res
 * @returns {Record<string,?> | null}
 */
export function getAnswers(res) {
	if (!res.locals || !res.locals.journeyResponse) {
		throw new Error('journey response required');
	}
	/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
	const journeyResponse = res.locals.journeyResponse;
	const answers = journeyResponse.answers;

	if (typeof answers !== 'object') {
		throw new Error('answers should be an object');
	}

	return answers;
}

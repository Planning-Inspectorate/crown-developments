import { JourneyResponse } from '../journey/journey-response.js';
import { BOOLEAN_OPTIONS } from '../components/boolean/question.js';

// functions for saving answers to the session

/**
 * A `SaveDataFn` implementation that saves answers to the session.
 * Answers are saved into a forms object, keyed by the journeyId.
 * @example
 * req: {
 * 	session: {
 * 		forms: {
 * 			'journey-id-1': {
 * 				questionOne: 'my answer'
 * 				// ...
 * 			}
 * 		}
 * 	}
 * }
 *
 * @type {import('../controller').SaveDataFn}
 */
export async function saveDataToSession({ req, journeyId, data }) {
	if (!req.session) {
		throw new Error('request session required');
	}
	/** @type {Object<string, any>} */
	const forms = req.session.forms || (req.session.forms = {});
	const answers = forms[journeyId] || (forms[journeyId] = {});

	for (const [k, v] of Object.entries(data?.answers || {})) {
		answers[k] = v;
	}
}

/**
 * Fetch session answers from the session
 *
 * @param {string} journeyId
 * @returns {import('express').Handler}
 */
export function buildGetJourneyResponseFromSession(journeyId) {
	return (req, res, next) => {
		if (!req.session) {
			throw new Error('request session required');
		}
		/** @type {Record<string, unknown>} */
		let answers = {};

		/** @type {Object<string, Record<string, unknown>>|undefined} */
		const forms = req.session?.forms;
		if (forms && journeyId in forms) {
			answers = forms[journeyId];
		}
		for (const [k, v] of Object.entries(answers)) {
			if (typeof v === 'boolean') {
				answers[k] = v ? BOOLEAN_OPTIONS.YES : BOOLEAN_OPTIONS.NO;
			}
		}
		res.locals.journeyResponse = new JourneyResponse(journeyId, req.sessionID, answers);
		next();
	};
}

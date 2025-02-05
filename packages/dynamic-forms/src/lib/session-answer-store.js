import { JourneyResponse } from '../journey/journey-response.js';
import { getYesNoValue } from '../components/boolean/question.js';

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
 * A function to clear journey answers from the session
 *
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
 * @param {Object} params
 * @param {import('express').Request} params.req
 * @param {string} params.journeyId
 * @param {Object<string, any>} [params.replaceWith] - optional data to replace the form answers with
 * @returns {void}
 */
export function clearDataFromSession({ req, journeyId, replaceWith }) {
	if (!req.session) {
		return; // no need to error, no action
	}
	/** @type {Object<string, any>} */
	const forms = req.session.forms || (req.session.forms = {});
	if (replaceWith) {
		forms[journeyId] = replaceWith;
	} else {
		delete forms[journeyId];
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
			answers = { ...forms[journeyId] }; // work with a copy, we don't want to edit session values
		}
		for (const [k, v] of Object.entries(answers)) {
			if (typeof v === 'boolean') {
				answers[k] = getYesNoValue(v);
			}
		}
		res.locals.journeyResponse = new JourneyResponse(journeyId, req.sessionID, answers);
		next();
	};
}

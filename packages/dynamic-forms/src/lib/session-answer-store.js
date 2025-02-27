import { JourneyResponse } from '../journey/journey-response.js';
import { booleanToYesNoValue } from '../components/boolean/question.js';

// functions for saving answers to the session

/**
 * A `SaveDataFn` implementation that saves answers to the session.
 * Answers are saved into a forms object, keyed by the journeyId, and optionally by a request parameter
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
 * or when keyed by a req parameter:
 * @example
 * req: {
 * 	session: {
 * 		forms: {
 * 			'some-req-param': {
 * 			   'journey-id-1': {
 * 				   questionOne: 'my answer'
 * 				   // ...
 * 			   }
 * 			}
 * 		}
 * 	}
 * }
 *
 *
 * @param {Object} opts
 * @param {string} [opts.reqParam] - optional request parameter to use as a key
 * @returns {import('../controller').SaveDataFn}
 */
export function buildSaveDataToSession({ reqParam } = {}) {
	return async ({ req, journeyId, data }) => {
		if (!req.session) {
			throw new Error('request session required');
		}
		/** @type {Object<string, any>} */
		let forms = req.session.forms || (req.session.forms = {});
		if (reqParam) {
			const reqParamValue = req.params[reqParam];
			// key by a further param
			forms = forms[reqParamValue] || (forms[reqParamValue] = {});
		}
		const answers = forms[journeyId] || (forms[journeyId] = {});

		for (const [k, v] of Object.entries(data?.answers || {})) {
			answers[k] = v;
		}
	};
}

/**
 * Default save-to-session function with no request parameter
 *
 * @type {import('../controller').SaveDataFn}
 */
export const saveDataToSession = buildSaveDataToSession();

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
 * @param {string} [params.reqParam] - optional request parameter used as a key
 * @returns {void}
 */
export function clearDataFromSession({ req, journeyId, replaceWith, reqParam }) {
	if (!req.session) {
		return; // no need to error, no action
	}
	/** @type {Object<string, any>} */
	let forms = req.session.forms || (req.session.forms = {});
	if (reqParam) {
		const reqParamValue = req.params[reqParam];
		// key by a further param
		forms = forms[reqParamValue] || (forms[reqParamValue] = {});
	}
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
 * @param {string} [reqParam] - optional request parameter used as a key
 * @returns {import('express').Handler}
 */
export function buildGetJourneyResponseFromSession(journeyId, reqParam) {
	return (req, res, next) => {
		if (!req.session) {
			throw new Error('request session required');
		}
		/** @type {Record<string, unknown>} */
		let answers = {};

		/** @type {Object<string, Record<string, unknown>>|undefined} */
		let forms = req.session?.forms;
		if (reqParam) {
			const reqParamValue = req.params[reqParam];
			forms = forms && forms[reqParamValue];
		}
		if (forms && journeyId in forms) {
			answers = { ...forms[journeyId] }; // work with a copy, we don't want to edit session values
		}
		for (const [k, v] of Object.entries(answers)) {
			if (typeof v === 'boolean') {
				answers[k] = booleanToYesNoValue(v);
			}
		}
		res.locals.journeyResponse = new JourneyResponse(journeyId, req.sessionID, answers);
		next();
	};
}

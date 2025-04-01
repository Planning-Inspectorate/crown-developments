import { isValidUuidFormat } from '../../util/uuid.js';
import { addSessionData } from '../../util/session.js';
import { viewModelToRepresentationCreateInput } from './view-model.js';
import { clearDataFromSession } from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { wrapPrismaError } from '../../util/database.js';
import { notFoundHandler } from '../../middleware/errors.js';
import { uniqueReference } from '../../util/random-reference.js';

/**
 * Save representation to the database
 *
 * @param {Object} opts
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('#service').PortalService | import('#service').ManageService} service
 * @param {string} opts.journeyId
 * @param {string} opts.checkYourAnswersUrl
 * @param {string} opts.successUrl
 * @param {function} [opts.uniqueReferenceFn] - optional function used for testing
 */
export async function saveRepresentation(
	{ service, journeyId, checkYourAnswersUrl, successUrl, uniqueReferenceFn = uniqueReference, notificationFn = null },
	req,
	res
) {
	const { db, logger } = service;

	const id = req.params.id || req.params.applicationId;
	const sessionReqParam = req.params.applicationId ? 'applicationId' : 'id';
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	if (!res.locals || !res.locals.journeyResponse) {
		throw new Error('journey response required');
	}
	const journeyResponse = res.locals.journeyResponse;
	const journey = res.locals.journey;
	const answers = journeyResponse.answers;
	if (typeof answers !== 'object') {
		throw new Error('answers should be an object');
	}
	if (!journey.isComplete()) {
		const error = [
			{
				text: 'Please complete all sections before submitting',
				url: '#'
			}
		];
		addSessionData(req, id, { representationError: { text: error } });
		res.redirect(checkYourAnswersUrl);
		return;
	}

	let reference;
	try {
		await db.$transaction(async ($tx) => {
			reference = await uniqueReferenceFn($tx);
			logger.info({ reference }, 'adding a new representation');
			await $tx.representation.create({
				data: viewModelToRepresentationCreateInput(answers, reference, id)
			});
			logger.info({ reference }, 'added a new representation');
		});
		clearDataFromSession({ req, journeyId, reqParam: sessionReqParam });
		addSessionData(req, id, { representationReference: reference, representationSubmitted: true }, 'representations');
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'adding a new representation',
			logParams: { id }
		});
	}

	if (notificationFn) {
		await notificationFn(service, answers, id, reference);
	}

	res.redirect(successUrl);
}

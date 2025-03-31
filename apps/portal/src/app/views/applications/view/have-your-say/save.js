import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { JOURNEY_ID } from './journey.js';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { viewModelToRepresentationCreateInput } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { clearDataFromSession } from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

/**
 * @param {import('#service').PortalService} service
 * @param {function} [uniqueReferenceFn] - optional function used for testing
 * @returns {import('express').Handler}
 */
export function buildSaveHaveYourSayController(service, uniqueReferenceFn = uniqueReference) {
	return async (req, res) => {
		const { db, logger, notifyClient } = service;
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
			res.redirect(`/applications/${req.params.applicationId}/have-your-say/check-your-answers`);
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
			clearDataFromSession({ req, journeyId: JOURNEY_ID, reqParam: sessionReqParam });
			addSessionData(req, id, { representationReference: reference, representationSubmitted: true }, 'representations');
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'adding a new representation',
				logParams: { id }
			});
		}

		if (notifyClient === null) {
			logger.warn(
				'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
			);
		} else {
			try {
				const notificationData = await populateNotificationData(req, service, answers, reference);
				await notifyClient.sendAcknowledgementOfRepresentation(
					notificationData.email,
					notificationData.personalisation
				);
			} catch (error) {
				logger.error({ error, reference }, `error dispatching Acknowledgement of representation email notification`);
				throw new Error('Error encountered during email notification dispatch');
			}
		}

		res.redirect(`/applications/${req.params.applicationId}/have-your-say/success`);
	};
}

/**
 * @param {import('express').Request} req
 * @param {import('#service').PortalService} service
 * @param {Record<string, unknown> | null} answers
 * @param {string} reference - representation reference
 * @returns {{email: string, personalisation: SendAcknowledgementOfRepresentationPersonalisation}} notificationData
 */
async function populateNotificationData(req, service, answers, reference) {
	const { db } = service;

	const id = req.params.applicationId;
	const crownDevelopment = await fetchPublishedApplication({
		id,
		db,
		args: {
			where: { id },
			select: { reference: true, description: true, SiteAddress: true }
		}
	});

	const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, service.contactEmail);

	const isMyself = answers.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF;
	const getField = (myselfField, submitterField) => (isMyself ? myselfField : submitterField);

	const email = getField(answers.myselfEmail, answers.submitterEmail);
	const addressee = getField(
		answers.myselfIsAdult !== BOOLEAN_OPTIONS.YES ? 'Sir/Madam' : answers.myselfFullName,
		answers.submitterIsAdult !== BOOLEAN_OPTIONS.YES ? 'Sir/Madam' : answers.submitterFullName
	);

	const personalisation = {
		reference: crownDevelopment.reference,
		addressee,
		applicationDescription: crownDevelopmentFields.description,
		siteAddress: crownDevelopmentFields.siteAddress,
		submittedDate: formatDateForDisplay(new Date()),
		representationReferenceNo: reference
	};

	return { email, personalisation };
}

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {import('express').Handler}
 */
export async function viewHaveYourSaySuccessPage(req, res) {
	const id = req.params.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	const representationReference = readSessionData(
		req,
		id,
		'representationReference',
		'reference not found',
		'representations'
	);
	const representationSubmitted = readSessionData(req, id, 'representationSubmitted', false, 'representations');

	if (!representationSubmitted && !representationReference) {
		const error = [
			{
				text: 'Something went wrong, please try submitting again',
				url: '#'
			}
		];
		addSessionData(req, id, { representationError: { text: error } });
		res.redirect(`/applications/${id}/have-your-say/check-your-answers`);
		return;
	}

	clearSessionData(req, id, ['representationReference', 'representationSubmitted'], 'representations');

	res.render('views/applications/view/have-your-say/success.njk', {
		title: 'Representation Submitted',
		bodyText: `Your reference number <br><strong>${representationReference}</strong>`,
		successBackLinkUrl: `/applications/${id}/application-information`,
		successBackLinkText: 'Back to the application information page'
	});
}

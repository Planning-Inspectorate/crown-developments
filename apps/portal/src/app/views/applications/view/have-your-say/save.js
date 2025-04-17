import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { JOURNEY_ID } from './journey.js';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { saveRepresentation } from '@pins/crowndev-lib/forms/representations/save.js';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';

/**
 * @param {import('#service').PortalService} service
 * @param {function} [uniqueReferenceFn] - optional function used for testing
 * @returns {import('express').Handler}
 */
export function buildSaveHaveYourSayController(service, uniqueReferenceFn = uniqueReference) {
	return async (req, res) => {
		await saveRepresentation(
			{
				service,
				journeyId: JOURNEY_ID,
				checkYourAnswersUrl: `/applications/${req.params.applicationId}/have-your-say/check-your-answers`,
				successUrl: `/applications/${req.params.applicationId}/have-your-say/success`,
				uniqueReferenceFn,
				notificationFn: sendAcknowledgementOfRepresentationNotification
			},
			req,
			res
		);
	};
}

/**
 * @param {import('#service').PortalService} service
 * @param {Record<string, unknown> | null} answers
 * @param {string} id - crown development application id
 * @param {string} representationReference
 */
export async function sendAcknowledgementOfRepresentationNotification(service, answers, id, representationReference) {
	const { logger, notifyClient } = service;
	if (notifyClient === null) {
		logger.warn(
			'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
		);
	} else {
		try {
			const notificationData = await populateNotificationData(id, service, answers, representationReference);
			await notifyClient.sendAcknowledgementOfRepresentation(notificationData.email, notificationData.personalisation);
		} catch (error) {
			logger.error(
				{ error, representationReference },
				`error dispatching Acknowledgement of representation email notification`
			);
			throw new Error('Error encountered during email notification dispatch');
		}
	}
}

/**
 * @param {string} id - crown development application id
 * @param {import('#service').PortalService} service
 * @param {Record<string, unknown> | null} answers
 * @param {string} reference - representation reference
 * @returns {{email: string, personalisation: SendAcknowledgementOfRepresentationPersonalisation}} notificationData
 */
export async function populateNotificationData(id, service, answers, reference) {
	const { db } = service;
	const crownDevelopment = await fetchPublishedApplication({
		id,
		db,
		args: {
			where: { id },
			include: { SiteAddress: true }
		}
	});

	const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, service.contactEmail);

	const isMyself = answers.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF;
	const getField = (myselfField, submitterField) => (isMyself ? myselfField : submitterField);

	const email = getField(answers.myselfEmail, answers.submitterEmail);
	const addressee = getField(
		answers.myselfIsAdult !== BOOLEAN_OPTIONS.YES
			? 'Sir/Madam'
			: nameToViewModel(answers.myselfFirstName, answers.myselfLastName),
		answers.submitterIsAdult !== BOOLEAN_OPTIONS.YES
			? 'Sir/Madam'
			: nameToViewModel(answers.submitterFirstName, answers.submitterLastName)
	);

	const siteAddress =
		crownDevelopmentFields.siteAddress ??
		'Easting: ' +
			crownDevelopmentFields.siteCoordinates?.easting +
			', Northing: ' +
			crownDevelopmentFields.siteCoordinates?.northing;

	const personalisation = {
		reference: crownDevelopment.reference,
		addressee,
		applicationDescription: crownDevelopmentFields.description,
		siteAddress: siteAddress,
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

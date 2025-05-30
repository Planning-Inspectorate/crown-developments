import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { getHaveYourSayStatus } from '../have-your-say/util.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage(service) {
	const { db } = service;
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const crownDevelopment = await fetchPublishedApplication({
			id,
			db,
			args: {
				include: {
					ApplicantContact: { select: { orgName: true } },
					DecisionOutcome: { select: { displayName: true } },
					Lpa: true,
					Type: true,
					SiteAddress: true,
					Event: true,
					Stage: { select: { displayName: true } },
					Procedure: { select: { displayName: true } }
				}
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, service.contactEmail);

		/** @type {HaveYourSayPeriod} */
		const haveYourSayPeriod = {
			start: crownDevelopment.representationsPeriodStartDate,
			end: crownDevelopment.representationsPeriodEndDate
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;

		const {
			applicationAcceptedDate,
			decisionDate,
			decisionOutcome,
			representationsPeriodStartDateTime,
			representationsPeriodEndDateTime
		} = crownDevelopmentFields;
		const shouldShowImportantDatesSection = [
			applicationAcceptedDate,
			representationsPeriodStartDateTime && representationsPeriodEndDateTime
		].some(Boolean);
		const shouldShowApplicationDecisionSection = [decisionDate, decisionOutcome].some(Boolean);

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Application Information',
			applicationReference: crownDevelopment.reference,
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: req.originalUrl,
			shouldShowImportantDatesSection,
			crownDevelopmentFields,
			shouldShowApplicationDecisionSection,
			haveYourSayStatus: getHaveYourSayStatus(haveYourSayPeriod, representationsPublishDate)
		});
	};
}

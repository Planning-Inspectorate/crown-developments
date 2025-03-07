import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../../config-types.js').Config} opts.config
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, config }) {
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
					ApplicantContact: { select: { fullName: true } },
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

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, config);

		/** @type {HaveYourSayPeriod} */
		const haveYourSayPeriod = {
			start: crownDevelopment.representationsPeriodStartDate,
			end: crownDevelopment.representationsPeriodEndDate
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;

		const { applicationCompleteDate, decisionDate, representationsPeriodStartDate, representationsPeriodEndDate } =
			crownDevelopmentFields;
		const shouldShowImportantDatesSection = [
			applicationCompleteDate,
			decisionDate,
			representationsPeriodStartDate && representationsPeriodEndDate
		].some(Boolean);

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Application Information',
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: req.originalUrl,
			shouldShowImportantDatesSection,
			crownDevelopmentFields
		});
	};
}

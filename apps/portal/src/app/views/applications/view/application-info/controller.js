import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('../../../../config-types.js').Config} opts.config
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, logger, config }) {
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
					ApplicantContact: { include: { Address: true } },
					Lpa: true,
					Type: true,
					SiteAddress: true
				}
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		logger.info(`Crown development case fetched: ${id}`);

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, config);

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Application Information',
			links: applicationLinks(id),
			currentUrl: req.baseUrl,
			crownDevelopmentFields
		});
	};
}

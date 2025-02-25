import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { applicationLinks, crownDevelopmentToViewModel, documentsLink } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../../config-types.js').Config} opts.config
 * @returns {import('express').Handler}
 */
export function buildHaveYourSayPage({ db, config }) {
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
			args: {}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, config);

		res.render('views/applications/view/have-your-say/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Have your say on a Crown Development Application',
			links: applicationLinks(id),
			documentsLink: documentsLink(id),
			currentUrl: req.originalUrl,
			crownDevelopmentFields
		});
	};
}

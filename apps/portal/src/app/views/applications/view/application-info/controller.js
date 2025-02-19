import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

const getCurrentDate = () => new Date();

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('../../../../config-types.js').Config} opts.config
 * @param {function(): Date} [opts.getNow]
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, logger, config, getNow = getCurrentDate }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}
		const now = getNow();

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id, publishDate: { lte: now } },
			include: {
				ApplicantContact: { select: { fullName: true } },
				Lpa: { select: { name: true } },
				Type: { select: { displayName: true } },
				SiteAddress: true,
				Event: true,
				Stage: { select: { displayName: true } },
				Procedure: { select: { displayName: true } }
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

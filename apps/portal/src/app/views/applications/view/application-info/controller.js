import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { crownDevelopmentToViewModel } from '../view-model.js';
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
				ApplicantContact: { include: { Address: true } },
				Lpa: true,
				Type: true,
				SiteAddress: true
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
			crownDevelopmentFields
		});
	};
}

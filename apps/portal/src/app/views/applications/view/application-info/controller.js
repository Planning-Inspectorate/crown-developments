import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, logger }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('Crown Development application id param required');
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ApplicantContact: { include: { Address: true } },
				AgentContact: { include: { Address: true } },
				Category: { include: { ParentCategory: true } },
				Event: true,
				Lpa: true,
				Type: true,
				SiteAddress: true,
				Stage: true
			}
		});

		if (crownDevelopment === null) {
			return notFoundHandler(req, res);
		}

		logger.info(`Crown development case fetched: ${id}`);

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Application Information',
			crownDevelopment,
			formatDateFunction: formatDateForDisplay,
			formatAddressFunction: formatAddress
		});
	};
}

function formatAddress(address) {
	return Object.entries(address)
		.filter(([key]) => key !== 'id')
		.filter(([, value]) => value !== null)
		.map(([, value]) => value)
		.join(', ');
}

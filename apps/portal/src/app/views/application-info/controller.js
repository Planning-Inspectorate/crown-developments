import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, logger }) {
	return async (req, res) => {
		const crownDevelopment = await db.crownDevelopment.findFirst({
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
		logger.info(`Crown development case fetched: ${crownDevelopment.reference}`);

		return res.render('views/application-info/view.njk', {
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

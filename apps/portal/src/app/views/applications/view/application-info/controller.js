/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, logger }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ApplicantContact: { include: { Address: true } },
				AgentContact: { include: { Address: true } },
				Category: { include: { ParentCategory: true } },
				Lpa: true,
				Type: true,
				SiteAddress: true
			}
		});
		logger.info(`Crown development case fetched: ${id}`);

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Application Information',
			id,
			crownDevelopment,
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

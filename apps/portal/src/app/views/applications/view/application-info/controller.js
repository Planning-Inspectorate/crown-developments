import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';

const getCurrentDate = () => new Date();

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage({ db, logger, config, getNow = getCurrentDate }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			throw new Error('id format is invalid');
		}
		const now = getNow();

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id, publishDate: { lte: now } },
			include: {
				ApplicantContact: { include: { Address: true } },
				AgentContact: { include: { Address: true } },
				Category: { include: { ParentCategory: true } },
				Lpa: true,
				Type: true,
				SiteAddress: true
			}
		});

		if (!crownDevelopment) {
			throw new Error('Crown development case not published. Please try again later');
		}

		logger.info(`Crown development case fetched: ${id}`);

		const crownDevContactEmail = config.crownDevContactInfo.email;

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Application Information',
			id,
			crownDevelopment,
			crownDevContactEmail,
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

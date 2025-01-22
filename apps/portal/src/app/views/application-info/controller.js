import { crownDevelopmentToViewModel } from 'crowndev-manage/src/app/views/cases/view/view-model.js';

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
				Lpa: { include: { Address: true } },
				SiteAddress: true,
				Stage: true
			}
		});
		logger.info(`Crown development case fetched: ${crownDevelopment.reference}`);

		const applicationType = await db.applicationType.findUnique({
			where: { id: crownDevelopment.typeId },
			select: {
				displayName: true
			}
		});

		const lpa = await db.lpa.findUnique({
			where: { id: crownDevelopment.lpaId },
			select: {
				name: true
			}
		});

		const answers = crownDevelopmentToViewModel(crownDevelopment);

		return res.render('views/application-info/view.njk', {
			pageCaption: answers.reference,
			pageTitle: 'Application Information',
			answers,
			applicationType,
			lpa,
			formatDateFunction: formatDate,
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

function formatDate(dateToFormat) {
	if (!dateToFormat) {
		return 'To be determined';
	}
	return new Date(dateToFormat).toDateString();
}

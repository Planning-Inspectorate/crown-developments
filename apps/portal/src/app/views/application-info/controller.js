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
		logger.info(`Application type fetched: ${applicationType.displayName}`);

		const lpa = await db.lpa.findUnique({
			where: { id: crownDevelopment.lpaId },
			select: {
				name: true
			}
		});
		logger.info(`Local planning authority fetched: ${lpa.name}`);

		const answers = crownDevelopmentToViewModel(crownDevelopment);

		//{{ field.labelSize if field.labelSize else "To be determined" }}

		return res.render('views/application-info/view.njk', {
			pageCaption: answers.reference,
			pageTitle: 'Application Information',
			answers,
			applicationType,
			lpaName: lpa.name,
			formattedAddress: formatAddress(answers.siteAddress),
			applicationAcceptedDate: formatDate(answers.applicationAcceptedDate),
			representationsPeriodEndDate: formatDate(answers.representationsPeriodEndDate),
			decisionDate: formatDate(answers.decisionDate)
		});
	};
}

function formatAddress(address) {
	return Object.values(address)
		.filter((key) => key !== null)
		.join(', ');
}

function formatDate(dateToFormat) {
	if (!dateToFormat) {
		return 'To be determined';
	}
	return new Date(dateToFormat).toDateString();
}

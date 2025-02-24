import { crownDevelopmentToViewModel } from '../view/view-model.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('../../../../config-types.js').Config} opts.config
 * @returns {import('express').Handler}
 */
export function buildApplicationListPage({ db, logger, config }) {
	return async (req, res) => {
		const now = new Date();

		const crownDevelopments = await db.crownDevelopment.findMany({
			where: { publishDate: { lte: now } },
			select: {
				id: true,
				reference: true,
				ApplicantContact: { select: { fullName: true } },
				Lpa: { select: { name: true } },
				Stage: { select: { displayName: true } },
				Type: { select: { displayName: true } }
			},
			orderBy: {
				createdDate: 'desc'
			},
			take: 1000 // upper limit until pagination/search is implemented
		});

		logger.info(`Crown development list page: ${crownDevelopments.length} case(s) fetched`);

		const crownDevelopmentsViewModels = crownDevelopments.map((crownDevelopment) =>
			crownDevelopmentToViewModel(crownDevelopment, config)
		);

		return res.render('views/applications/list/view.njk', {
			pageTitle: 'Applications',
			crownDevelopmentsViewModels
		});
	};
}

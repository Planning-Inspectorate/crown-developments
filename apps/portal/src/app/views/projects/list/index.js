/**
 * @typedef {Object} CrownDevelopmentListViewModel
 * @property {string} id
 * @property {string} name
 * @property {string} [stage]
 * @property {string} [applicantName]
 */

const getCurrentDate = () => new Date();

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {function(): Date} [opts.getNow] - for testing
 * @returns {import('express').Handler}
 */
export function buildListProjects({ db, logger, getNow = getCurrentDate }) {
	return async (req, res) => {
		logger.info('list projects');

		const now = getNow();

		const crownDevelopments = await db.crownDevelopment.findMany({
			// only published cases
			where: { publishDate: { lte: now } },
			select: {
				id: true,
				name: true,
				publishDate: true,
				Stage: { select: { displayName: true } },
				ApplicantContact: { select: { fullName: true } }
			},
			orderBy: {
				name: 'asc'
			},
			take: 1000 // upper limit until pagination/search is implemented
		});

		const projects = crownDevelopments.map((cd) => crownDevelopmentToViewModel(cd, now)).filter((cd) => cd !== null);

		logger.info({ count: projects.length }, 'got projects');

		return res.render('views/projects/list/view.njk', {
			pageHeading: 'Projects',
			projects
		});
	};
}

/**
 *
 * @param {import('@prisma/client').Prisma.CrownDevelopmentGetPayload<{select: {
 *   			id: true,
 * 				name: true,
 * 				Stage: { select: { displayName: true } },
 * 				ApplicantContact: { select: { fullName: true } }
 * }}>} crownDevelopment
 * @param {Date} now
 * @return {CrownDevelopmentListViewModel|null}
 */
export function crownDevelopmentToViewModel(crownDevelopment, now) {
	// if not published, ignore it
	if (!crownDevelopment.publishDate) {
		return null;
	}
	// if published in the future, ignore it
	if (crownDevelopment.publishDate.getTime() > now.getTime()) {
		return null;
	}
	return {
		id: crownDevelopment.id,
		name: crownDevelopment.name,
		stage: crownDevelopment.Stage?.displayName,
		applicantName: crownDevelopment.ApplicantContact?.fullName
	};
}

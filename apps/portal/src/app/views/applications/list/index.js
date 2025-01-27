const getCurrentDate = () => new Date();

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {function(): Date} [opts.getNow] - for testing
 * @returns {import('express').Handler}
 */
export function buildListApplications({ db, logger, getNow = getCurrentDate }) {
	return async (req, res) => {
		logger.info('list applications');

		const now = getNow();

		const crownDevelopments = await db.crownDevelopment.findMany({
			// only published cases
			where: { publishDate: { lte: now } },
			select: {
				id: true,
				reference: true,
				publishDate: true,
				Stage: { select: { displayName: true } },
				ApplicantContact: { select: { fullName: true } },
				Lpa: { select: { name: true } }
			},
			orderBy: {
				reference: 'asc'
			},
			take: 1000 // upper limit until pagination/search is implemented
		});

		const applications = crownDevelopments
			.map((cd) => crownDevelopmentToViewModel(cd, now))
			.filter((cd) => cd !== null);

		logger.info({ count: applications.length }, 'got applications');

		return res.render('views/applications/list/view.njk', {
			pageHeading: 'Applications',
			applications
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
 * 				Lpa: {select: { name: true } }
 * }}>} crownDevelopment
 * @param {Date} now
 * @return {import('./types.js').CrownDevelopmentListViewModel|null}
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
		reference: crownDevelopment.reference,
		stage: crownDevelopment.Stage?.displayName,
		applicantName: crownDevelopment.ApplicantContact?.fullName,
		lpaName: crownDevelopment.Lpa?.name
	};
}

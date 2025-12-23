import { addYears, isAfter, isValid } from 'date-fns';

/**
 * Application status for clarity and readability
 */
export const ApplicationStatus = {
	ACTIVE: 'active',
	WITHDRAWN: 'withdrawn',
	WITHDRAWN_EXPIRED: 'withdrawn_expired'
};

/**
 * Determine application status based on withdrawnDate and expiry
 * @param {Date|null|undefined} withdrawnDate
 * @param {Date} [now]
 * @returns {string} ApplicationStatus
 */
export function getApplicationStatus(withdrawnDate, now = new Date()) {
	if (!withdrawnDate || !(withdrawnDate instanceof Date) || !isValid(withdrawnDate)) {
		return ApplicationStatus.ACTIVE;
	}
	if (isAfter(withdrawnDate, now)) {
		return ApplicationStatus.ACTIVE;
	}
	const expired = isAfter(now, addYears(withdrawnDate, 1));
	return expired ? ApplicationStatus.WITHDRAWN_EXPIRED : ApplicationStatus.WITHDRAWN;
}

/**
 * @typedef {import('@pins/crowndev-database').CrownDevelopment & { withdrawnDateIsExpired?: boolean, applicationStatus?: string }} CrownDevelopmentWithExpiry
 */

/**
 * @param {Object} opts
 * @param {import('@pins/crowndev-database').PrismaClient} opts.db
 * @param {string} opts.id
 * @param {import('@pins/crowndev-database').Prisma.CrownDevelopmentFindUniqueArgs} opts.args
 * @returns {Promise<CrownDevelopmentWithExpiry|null>}
 */
export async function fetchPublishedApplication({ db, id, args }) {
	if (!args.where) {
		args.where = { id };
	}
	args.where.id = id;
	const now = new Date();
	args.where.publishDate = { lte: now };
	const crownDevelopment = await db.crownDevelopment.findUnique(args);
	if (crownDevelopment) {
		crownDevelopment.applicationStatus = getApplicationStatus(crownDevelopment.withdrawnDate, now);
		crownDevelopment.withdrawnDateIsExpired =
			crownDevelopment.applicationStatus === ApplicationStatus.WITHDRAWN_EXPIRED;
	}
	return crownDevelopment;
}

import { addYears, isAfter, isValid } from 'date-fns';

/**
 * Application status for clarity and readability
 */
export const APPLICATION_PUBLISH_STATUS = {
	ACTIVE: 'active',
	WITHDRAWN: 'withdrawn',
	EXPIRED: 'expired'
};

/**
 * Determine application status based on withdrawnDate and expiry
 * @param {Date|null|undefined} withdrawnDate
 * @returns {string} ApplicationStatus
 */
export function getApplicationStatus(withdrawnDate) {
	const now = new Date();
	if (!withdrawnDate || !(withdrawnDate instanceof Date) || !isValid(withdrawnDate)) {
		return APPLICATION_PUBLISH_STATUS.ACTIVE;
	}
	if (isAfter(withdrawnDate, now)) {
		return APPLICATION_PUBLISH_STATUS.ACTIVE;
	}
	const expired = isAfter(now, addYears(withdrawnDate, 1));
	return expired ? APPLICATION_PUBLISH_STATUS.EXPIRED : APPLICATION_PUBLISH_STATUS.WITHDRAWN;
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
		const status = getApplicationStatus(crownDevelopment.withdrawnDate);
		crownDevelopment.applicationStatus = status;
		crownDevelopment.withdrawnDateIsExpired = status === APPLICATION_PUBLISH_STATUS.EXPIRED;
	}
	return crownDevelopment;
}

import { getCurrentDate } from '@pins/crowndev-lib/util/date.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {string} opts.id
 * @param {import('@prisma/client').Prisma.CrownDevelopmentFindUniqueArgs} opts.args
 * @param {() => Date} [opts.getNow] - for testing
 * @returns {Promise<import('@priam/client').CrownDevelopment|null>}
 */
export async function fetchPublishedApplication({ db, id, args, getNow = getCurrentDate }) {
	if (!args.where) {
		args.where = { id };
	}
	args.where.id = id;
	const now = getNow();
	args.where.publishDate = { lte: now };
	return db.crownDevelopment.findUnique(args);
}

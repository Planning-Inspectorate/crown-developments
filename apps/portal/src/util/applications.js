/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {string} opts.id
 * @param {import('@prisma/client').Prisma.CrownDevelopmentFindUniqueArgs} opts.args
 * @returns {Promise<import('@priam/client').CrownDevelopment|null>}
 */
export async function fetchPublishedApplication({ db, id, args }) {
	if (!args.where) {
		args.where = { id };
	}
	args.where.id = id;
	const now = new Date();
	args.where.publishDate = { lte: now };
	return db.crownDevelopment.findUnique(args);
}

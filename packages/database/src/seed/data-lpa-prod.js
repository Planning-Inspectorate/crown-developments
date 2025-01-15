/**
 * @type {import('@prisma/client').Prisma.LpaCreateInput[]}
 */
export const LOCAL_PLANNING_AUTHORITIES = [];

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedProdLpas(dbClient) {
	await Promise.all(
		LOCAL_PLANNING_AUTHORITIES.map((lpa) =>
			dbClient.lpa.upsert({
				create: lpa,
				update: lpa,
				where: { id: lpa.id }
			})
		)
	);

	console.log('prod LPAs seed complete');
}

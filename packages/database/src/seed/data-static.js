/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedStaticData(dbClient) {
	// todo: static data

	// remove once there is some code here
	await dbClient.$connect();

	console.log('static data seed complete');
}

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedDev(dbClient) {
	// todo: seed some dev/test data

	// remove once there is some code here
	await dbClient.$connect();

	console.log('dev seed complete');
}

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@prisma/client').Prisma.LpaCreateInput[]}
 */
export const LOCAL_PLANNING_AUTHORITIES = [
	{
		id: '4515ebac-65e2-4bcd-bc0b-a6fee69ae25a',
		name: 'System Test Borough Council',
		pinsCode: 'Q9999',
		email: 'system-test-council@example.com'
	},
	{
		id: '1a76f67e-5828-4532-bd6f-aa7ef40a13ca',
		name: 'Another System Test Borough Council',
		email: 'another-system-test-council@example.com'
	}
];

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedDevLpas(dbClient) {
	await Promise.all(
		LOCAL_PLANNING_AUTHORITIES.map((lpa) =>
			dbClient.lpa.upsert({
				create: lpa,
				update: lpa,
				where: { id: lpa.id }
			})
		)
	);
	console.log('dev LPAs seed complete');
}

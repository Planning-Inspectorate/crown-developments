const address1 = { connect: { id: 'c17101b1-b4bc-4824-928a-74a970f0e50a' } };
const address2 = { connect: { id: '8e71bff1-e8c5-4980-8431-dd5c1cc766a4' } };

export const ADDRESSES = [
	{
		id: 'c17101b1-b4bc-4824-928a-74a970f0e50a',
		line1: 'PO Box 270',
		line2: 'Guildhall',
		townCity: 'London',
		postcode: 'EC2P 2EJ'
	},
	{
		id: '8e71bff1-e8c5-4980-8431-dd5c1cc766a4',
		line1: '1 Town Square',
		townCity: 'Barking',
		postcode: 'IG11 7LU'
	}
];

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
		email: 'system-test-council@example.com',
		Address: address1,
		telephoneNumber: '1234567890'
	},
	{
		id: '1a76f67e-5828-4532-bd6f-aa7ef40a13ca',
		name: 'Another System Test Borough Council',
		email: 'another-system-test-council@example.com',
		Address: address2,
		telephoneNumber: '0987654321'
	}
];

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedDevLpas(dbClient) {
	await Promise.all(
		ADDRESSES.map((address) =>
			dbClient.address.upsert({
				create: address,
				update: address,
				where: { id: address.id }
			})
		)
	);

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

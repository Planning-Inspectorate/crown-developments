import PROD_LPAS from './data-lpa-prod-list.json' with { type: 'json' };

/**
 * @type {import('@prisma/client').Prisma.LpaCreateInput[]}
 */
export const LOCAL_PLANNING_AUTHORITIES = PROD_LPAS;

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedProdLpas(dbClient) {
	const counts = {
		created: 0,
		updated: 0
	};
	for (const lpa of LOCAL_PLANNING_AUTHORITIES) {
		const created = await seedLpa(dbClient, lpa); // sequential, each done in a transaction
		if (created) {
			counts.created++;
		} else {
			counts.updated++;
		}
	}

	console.log('prod LPAs seed complete', counts);
}

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 * @param {import('@prisma/client').Prisma.LpaCreateInput} lpaCreateInput
 * @returns {Promise<boolean>} - true if created
 */
async function seedLpa(dbClient, lpaCreateInput) {
	await dbClient.$transaction(async ($tx) => {
		const lpa = await $tx.lpa.findFirst({
			where: {
				onsCode: lpaCreateInput.onsCode
			},
			include: { Address: true }
		});

		if (!lpa) {
			// simple create
			console.log('creating:', lpaCreateInput.name);
			await dbClient.lpa.create({
				data: lpaCreateInput
			});
			return true;
		}
		console.log('updating:', lpaCreateInput.name);

		const hasExistingAddress = Boolean(lpa.addressId);
		const address = lpaCreateInput.Address?.create;
		if (hasExistingAddress && address) {
			delete lpaCreateInput.Address;
			// update the address
			await dbClient.address.update({
				where: {
					id: lpa.addressId
				},
				data: address
			});
		}

		// update the LPA
		await dbClient.lpa.update({
			where: {
				id: lpa.id
			},
			data: lpaCreateInput
		});
		return false;
	});
}

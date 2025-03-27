import { APPLICATION_TYPE_ID } from './data-static.js';
import {
	generateWrittenRepresentation,
	oldRepReferences,
	persistWrittenRepresentation,
	repReferences,
	representations,
	repsBehalfOfContacts,
	repsContacts,
	repsOrgContacts
} from './representations-data-dev.js';
import { seedUatCases } from './data-reps-uat-dev.js';

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedDev(dbClient) {
	// ensure there is a case to link representations to
	const crownDev = await dbClient.crownDevelopment.upsert({
		where: { reference: 'CROWN/2025/0000001' },
		create: { reference: 'CROWN/2025/0000001', Type: { connect: { id: APPLICATION_TYPE_ID.PLANNING_PERMISSION } } },
		update: { reference: 'CROWN/2025/0000001', Type: { connect: { id: APPLICATION_TYPE_ID.PLANNING_PERMISSION } } }
	});

	const allContacts = [...repsContacts, ...repsOrgContacts, ...repsBehalfOfContacts];
	const contactIds = new Map();
	// check IDs are unique
	for (const contact of allContacts) {
		if (contactIds.has(contact.id)) {
			throw new Error(`Duplicate contact ID: ${contact.id}`);
		}
		contactIds.set(contact.id, true);
	}

	for (const contact of [...repsContacts, ...repsOrgContacts, ...repsBehalfOfContacts]) {
		await dbClient.contact.upsert({
			where: { id: contact.id },
			create: contact,
			update: contact
		});
	}

	const repRefs = new Map();
	// check references are unique
	for (const representation of representations) {
		if (repRefs.has(representation.reference)) {
			throw new Error(`Duplicate representation reference: ${representation.reference}`);
		}
		repRefs.set(representation.reference, true);
	}

	for (const representationReference of repReferences) {
		if (repRefs.has(representationReference)) {
			throw new Error(`Duplicate representation reference: ${representationReference}`);
		}
		repRefs.set(representationReference, true);
	}

	// map older references to newer ones - can be removed once run
	for (const oldRepReference of oldRepReferences) {
		// XXXX-YYYY-ZZZZ-AAAA -> XXXXY-YYYZZ
		const parts = oldRepReference.split('-');
		const part1 = parts[0] + parts[1].substring(0, 1);
		const part2 = parts[1].substring(1, 4) + parts[2].substring(0, 2);
		const newRepReference = `${part1}-${part2}`;
		await dbClient.$transaction(async ($tx) => {
			const rep = await $tx.representation.findUnique({ where: { reference: oldRepReference } });
			if (rep) {
				await $tx.representation.update({
					where: { reference: oldRepReference },
					data: { reference: newRepReference }
				});
			}
		});
	}

	for (const representation of representations) {
		representation.Application = { connect: { id: crownDev.id } };
		await persistWrittenRepresentation(dbClient, representation);
	}

	for (const representationReference of repReferences) {
		const representation = generateWrittenRepresentation(representationReference);
		representation.Application = { connect: { id: crownDev.id } };
		await persistWrittenRepresentation(dbClient, representation);
	}

	await seedUatCases(dbClient);

	console.log('dev seed complete');
}

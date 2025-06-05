import { APPLICATION_TYPE_ID } from './data-static.js';
import {
	generateWrittenRepresentation,
	persistWrittenRepresentation,
	repReferences,
	representationContactAddresses,
	representationDocuments,
	representations,
	repsBehalfOfPersonContacts,
	repsContacts,
	repsOnBehalfOfOrgContacts
} from './representations-data-dev.js';

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

	const allAddresses = representationContactAddresses;
	const addressIds = new Map();
	// check IDs are unique
	for (const address of allAddresses) {
		if (addressIds.has(address.id)) {
			throw new Error(`Duplicate address ID: ${address.id}`);
		}
		addressIds.set(address.id, true);
	}

	for (const address of allAddresses) {
		await dbClient.address.upsert({
			where: { id: address.id },
			create: address,
			update: address
		});
	}

	const allContacts = [...repsContacts, ...repsOnBehalfOfOrgContacts, ...repsBehalfOfPersonContacts];
	const contactIds = new Map();
	// check IDs are unique
	for (const contact of allContacts) {
		if (contactIds.has(contact.id)) {
			throw new Error(`Duplicate contact ID: ${contact.id}`);
		}
		contactIds.set(contact.id, true);
	}

	for (const contact of [...repsContacts, ...repsOnBehalfOfOrgContacts, ...repsBehalfOfPersonContacts]) {
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

	for (const representation of representations) {
		representation.Application = { connect: { id: crownDev.id } };
		await persistWrittenRepresentation(dbClient, representation);
	}

	for (const representationReference of repReferences) {
		const representation = generateWrittenRepresentation(representationReference);
		representation.Application = { connect: { id: crownDev.id } };
		await persistWrittenRepresentation(dbClient, representation);
	}

	const allRepresentationDocuments = representationDocuments;
	const documentIds = new Map();
	// check IDs are unique
	for (const representationDocument of allRepresentationDocuments) {
		if (documentIds.has(representationDocument.id)) {
			throw new Error(`Duplicate document ID: ${representationDocument.id}`);
		}
		documentIds.set(representationDocument.id, true);
	}
	//Create or update representation documents and update the representation to contain attachments
	for (const representationDocument of allRepresentationDocuments) {
		await dbClient.representationDocument.upsert({
			where: { id: representationDocument.id },
			create: representationDocument,
			update: representationDocument
		});
	}

	console.log('dev seed complete');
}

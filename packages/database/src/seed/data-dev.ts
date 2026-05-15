import { APPLICATION_TYPE_ID, APPLICATION_STATUS_ID } from './data-static.ts';
import {
	applicationUpdates,
	generateWrittenRepresentation,
	persistWrittenRepresentation,
	repReferences,
	representationContactAddresses,
	representationDocuments,
	representations,
	repsBehalfOfPersonContacts,
	repsContacts,
	repsOnBehalfOfOrgContacts
} from './representations-data-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES } from './data-lpa-dev.ts';
import type { PrismaClient } from '../client/client.ts';

export async function seedDev(dbClient: PrismaClient) {
	// ensure there is a case to link representations to
	const reference = `CROWN/2025/0000001`;
	const upsertOperation = {
		reference: reference,
		description: 'Test case',
		Type: { connect: { id: APPLICATION_TYPE_ID.PLANNING_PERMISSION } },
		Lpa: { connect: { id: LOCAL_PLANNING_AUTHORITIES[0].id } },
		Status: { connect: { id: APPLICATION_STATUS_ID.NEW } },
		expectedDateOfSubmission: new Date(),
		containsDistressingContent: true
	};
	const crownDev = await dbClient.crownDevelopment.upsert({
		where: { reference: reference },
		create: upsertOperation,
		update: upsertOperation
	});

	const allAddresses = representationContactAddresses;
	const addressIds = new Map<string, boolean>();
	// check IDs are unique
	for (const address of allAddresses) {
		if (!address.id) {
			throw new Error('Address is missing ID');
		}
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
	const contactIds = new Map<string, boolean>();
	// check IDs are unique
	for (const contact of allContacts) {
		if (!contact.id) {
			throw new Error('Contact is missing ID');
		}
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

	const repRefs = new Map<string, boolean>();
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

	for (const partialRepresentation of representations) {
		const fullRepresentation = {
			...partialRepresentation,
			Application: { connect: { id: crownDev.id } }
		};
		await persistWrittenRepresentation(dbClient, fullRepresentation);
	}

	for (const representationReference of repReferences) {
		const representation = generateWrittenRepresentation(representationReference, crownDev.id);
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
	//Create or update application updates and update the crown development application to contain application updates
	for (const partialApplicationUpdate of applicationUpdates) {
		const applicationUpdate = {
			...partialApplicationUpdate,
			Application: { connect: { id: crownDev.id } }
		};
		await dbClient.applicationUpdate.upsert({
			where: { id: applicationUpdate.id },
			create: applicationUpdate,
			update: applicationUpdate
		});
	}

	console.log('dev seed complete');
}

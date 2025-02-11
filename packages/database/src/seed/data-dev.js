import { REPRESENTATION_STATUS_ID, REPRESENTATION_TYPE_ID } from './data-static.js';

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@prisma/client').Prisma.ContactCreateInput[]}
 */
const repsContacts = [
	{ id: '05fa5f0f-342d-466d-8d61-e837586d6a3d', fullName: 'Person One' },
	{ id: 'b4654a6b-7ab1-4391-8e81-839809b0dfb0', fullName: 'Person Two' },
	{ id: 'afb9d282-0db0-4fbd-a9f9-90c13f1e3cd0', fullName: 'Person Three' },
	{ id: '1bb4a1c8-d068-4d75-bcaa-9dc0e33ac1ee', fullName: 'Person Four' },
	{ id: 'c98304bd-5607-4819-9bd2-9af51d9b419f', fullName: 'Person Five' },
	{ id: '14c92bd0-8457-480d-8b10-a3fb6c0fd372', fullName: 'Person Six' },
	{ id: '5636f842-3263-4a27-9b83-86229ae1dd67', fullName: 'Person Seven' },
	{ id: 'c3b722e6-afba-4a9f-87f1-96db55e145c1', fullName: 'Person Eight' },
	{ id: '30925c6a-d50d-40a9-93e3-b6b7a3ff2fbb', fullName: 'Person Nine' },
	{ id: 'f589adb8-73e2-4562-86ce-bd81fc33d2af', fullName: 'Person Ten' },
	{ id: '0af835c0-8ed1-46a1-b43f-665fc062b1ed', fullName: 'Person Eleven' },
	{ id: 'd75f3116-945e-44a4-bffd-4cd36d1cc968', fullName: 'Person Twelve' },
	{ id: '61700b0a-2251-4779-ba3d-6b0cb9d034a9', fullName: 'Person Thirteen' },
	{ id: 'e1f12f5b-4107-456d-8ab1-ca7b4b8e114a', fullName: 'Person Fourteen' },
	{ id: 'cda925f4-2393-454c-8381-f07b2332547b', fullName: 'Person Fifteen' },
	{ id: 'b084ed4d-d835-4b49-9a4f-cb25bb36a445', fullName: 'Person Sixteen' },
	{ id: '98b8b7c1-598d-4fd7-b5f1-f160528cb3b5', fullName: 'Person Seventeen' },
	{ id: '9cbc1386-e4bb-4dbe-a6d2-c6f2189449c3', fullName: 'Person Eighteen' },
	{ id: '35f252df-48f6-416a-97c3-b4cf2985c459', fullName: 'Person Nineteen' },
	{ id: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84', fullName: 'Person Twenty' }
];

/**
 * References here are generated with newReference function in have-your-say
 * @type {import('@prisma/client').Prisma.RepresentationCreateInput[]}
 */
const representations = [
	{
		reference: '5031-5316-3D51-66E3',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[0].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '4705-B405-AD6A-069E',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[1].id } },
		status: REPRESENTATION_STATUS_ID.REJECTED
	},
	{
		reference: 'A9BC-3915-FDF0-6878',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[2].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '1295-C726-E8AB-36F4',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[3].id } },
		status: REPRESENTATION_STATUS_ID.ACCEPTED
	},
	{
		reference: 'ADE3-E60E-0C99-E01B',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[4].id } },
		status: REPRESENTATION_STATUS_ID.ACCEPTED
	},
	{
		reference: '7806-3E19-BBBC-CEEF',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[5].id } },
		status: REPRESENTATION_STATUS_ID.REJECTED
	},
	{
		reference: '6EFB-4E9C-8B6B-040F',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[6].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: 'FA0F-1C40-19CB-E6C1',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[7].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '3368-30DE-BE9A-126E',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[8].id } },
		status: REPRESENTATION_STATUS_ID.REJECTED
	},
	{
		reference: '1E11-CC92-E6D8-FF71',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[9].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '9D82-748F-3788-5B87',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T10:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[10].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: 'F095-62CF-1FB7-645D',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-01-27T16:46:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[11].id } },
		status: REPRESENTATION_STATUS_ID.REJECTED
	},
	{
		reference: 'C96A-4ECE-B9B4-F52C',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-02T09:32:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[12].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: 'AD88-8F0C-2986-DBB0',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-01T18:19:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[13].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '554C-0F04-1A2F-155E',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-01T14:31:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[14].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '8479-A8FA-798A-B0A2',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T07:50:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[15].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '7128-26A4-74A2-8029',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-03T08:14:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[16].id } },
		status: REPRESENTATION_STATUS_ID.ACCEPTED
	},
	{
		reference: '1D5A-ACF9-D357-0A7C',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-01-26T22:03:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[17].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: 'E7A9-3F3D-48D7-1EB5',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-01-30T18:16:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[18].id } },
		status: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	},
	{
		reference: '8083-1C32-ACB0-BFFB',
		originalComment: 'Some comment about this application',
		receivedDate: new Date('2025-02-02T15:56:00.000Z'),
		RepresentedType: { connect: { id: REPRESENTATION_TYPE_ID.PERSON } },
		Contact: { connect: { id: repsContacts[19].id } },
		status: REPRESENTATION_STATUS_ID.ACCEPTED
	}
];

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedDev(dbClient) {
	const crownDev = await dbClient.crownDevelopment.upsert({
		where: { reference: 'CROWN/2025/0000001' },
		create: { reference: 'CROWN/2025/0000001', Type: { connect: { id: 'planning-permission' } } },
		update: { reference: 'CROWN/2025/0000001', Type: { connect: { id: 'planning-permission' } } }
	});

	for (const repsContact of repsContacts) {
		await dbClient.contact.upsert({
			where: { id: repsContact.id },
			create: repsContact,
			update: repsContact
		});
	}

	for (const representation of representations) {
		representation.Project = {
			connect: { id: crownDev.id }
		};
		await dbClient.representation.upsert({
			where: { projectId: crownDev.id, reference: representation.reference },
			create: representation,
			update: representation
		});
	}

	console.log('dev seed complete');
}

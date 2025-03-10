import {
	APPLICATION_TYPE_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from './data-static.js';

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@prisma/client').Prisma.ContactCreateInput[]}
 */
const repsContacts = [
	{ id: '05fa5f0f-342d-466d-8d61-e837586d6a3d', fullName: 'Person One', email: 'person-one@example.com' },
	{ id: 'b4654a6b-7ab1-4391-8e81-839809b0dfb0', fullName: 'Person Two' },
	{ id: 'afb9d282-0db0-4fbd-a9f9-90c13f1e3cd0', fullName: 'Person Three', email: 'person-three@example.com' },
	{ id: '1bb4a1c8-d068-4d75-bcaa-9dc0e33ac1ee', fullName: 'Person Four' },
	{ id: 'c98304bd-5607-4819-9bd2-9af51d9b419f', fullName: 'Person Five', email: 'person-five@example.com' },
	{ id: '14c92bd0-8457-480d-8b10-a3fb6c0fd372', fullName: 'Person Six', jobTitleOrRole: 'Chief Commenter' },
	{ id: '5636f842-3263-4a27-9b83-86229ae1dd67', fullName: 'Person Seven', jobTitleOrRole: 'Manager' },
	{
		id: 'c3b722e6-afba-4a9f-87f1-96db55e145c1',
		fullName: 'Person Eight',
		email: 'person-eight@example.com',
		jobTitleOrRole: 'Planning Person'
	},
	{ id: '30925c6a-d50d-40a9-93e3-b6b7a3ff2fbb', fullName: 'Person Nine', jobTitleOrRole: 'Representative' },
	{ id: 'f589adb8-73e2-4562-86ce-bd81fc33d2af', fullName: 'Person Ten', jobTitleOrRole: 'Community Spokesperson' },
	{ id: '0af835c0-8ed1-46a1-b43f-665fc062b1ed', fullName: 'Person Eleven', email: 'person-eleven@example.com' },
	{ id: 'd75f3116-945e-44a4-bffd-4cd36d1cc968', fullName: 'Person Twelve' },
	{ id: '61700b0a-2251-4779-ba3d-6b0cb9d034a9', fullName: 'Person Thirteen', email: 'person-thirteen@example.com' },
	{ id: 'e1f12f5b-4107-456d-8ab1-ca7b4b8e114a', fullName: 'Person Fourteen' },
	{ id: 'cda925f4-2393-454c-8381-f07b2332547b', fullName: 'Person Fifteen' },
	{ id: 'b084ed4d-d835-4b49-9a4f-cb25bb36a445', fullName: 'Person Sixteen', email: 'person-sixteen@example.com' },
	{ id: '98b8b7c1-598d-4fd7-b5f1-f160528cb3b5', fullName: 'Person Seventeen' },
	{ id: '9cbc1386-e4bb-4dbe-a6d2-c6f2189449c3', fullName: 'Person Eighteen' },
	{ id: '35f252df-48f6-416a-97c3-b4cf2985c459', fullName: 'Person Nineteen' },
	{ id: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84', fullName: 'Person Twenty' }
];

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@prisma/client').Prisma.ContactCreateInput[]}
 */
const repsOrgContacts = [
	{ id: 'c561a9bb-a1c4-4836-9f6f-0ea904c79475', fullName: 'Org One' },
	{ id: '1d421817-caa1-40e7-9f6c-e915309707c1', fullName: 'Org Two' },
	{ id: 'f4a79154-a216-4263-81b1-2a8660e63376', fullName: 'Org Three' },
	{ id: '595a08cf-ee0e-4118-b75d-e5b4ea1ab812', fullName: 'Charity One' },
	{ id: 'f9c46547-c6b9-4be3-9140-3f6ff308a5ed', fullName: 'Charity Two' }
];

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@prisma/client').Prisma.ContactCreateInput[]}
 */
const repsBehalfOfContacts = [
	{ id: '7c3619fb-81ff-4164-8edb-8baae3dfc087', fullName: 'Person A' },
	{ id: 'f48bc3e9-87b2-4d9e-ad49-2fc48a48472f', fullName: 'Person B' },
	{ id: '562997bd-b50a-4902-8601-d0b347c839c3', fullName: 'Person C' },
	{ id: 'df65db2c-e644-4065-88a5-81e673ebd714', fullName: 'Person D' },
	{ id: '94a2a7ce-2c97-460e-adc3-0b019c1ef470', fullName: 'Person E' },
	{ id: 'b874a850-0264-4ac4-a52d-fddfa05b4a1f', fullName: 'Community Org 1' },
	{ id: 'd5a3a6a5-4809-41fc-8367-672ed57f6076', fullName: 'Community Org 2' },
	{ id: 'a7bd8186-6913-49f3-862e-18c38e615f2e', fullName: 'Community Org 3' },
	{ id: '9a9b7479-6fde-49ae-9c9f-e1b553bea904', fullName: 'Household 1' },
	{ id: '8aa7a2ad-ff79-4355-a436-46e557971bb9', fullName: 'Household 2' }
];

/**
 * References here are generated with generateNewReference function in have-your-say
 * @type {import('@prisma/client').Prisma.RepresentationCreateInput[]}
 */
const representations = [
	{
		reference: '50315-3163D',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
		SubmittedByContact: { connect: { id: repsContacts[0].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '4705B-405AD',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
		SubmittedByContact: { connect: { id: repsContacts[1].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.REJECTED } },
		containsAttachments: false
	},
	{
		reference: 'A9BC3-915FD',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
		SubmittedByContact: { connect: { id: repsContacts[2].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '1295C-726E8',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
		SubmittedByContact: { connect: { id: repsContacts[3].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: true
	},
	{
		reference: 'ADE3E-60E0C',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
		SubmittedByContact: { connect: { id: repsContacts[4].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: true
	},
	{
		reference: '78063-E19BB',
		comment: 'Some comment about this application',
		commentRedacted: 'Some ███████ about this application',
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[5].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsOrgContacts[0].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: false
	},
	{
		reference: '6EFB4-E9C8B',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[6].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsOrgContacts[1].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: 'FA0F1-C4019',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[7].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsOrgContacts[2].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '33683-0DEBE',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[8].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsOrgContacts[3].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.REJECTED } },
		containsAttachments: false
	},
	{
		reference: '1E11C-C92E6',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[9].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsOrgContacts[4].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '9D827-48F37',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[10].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.PERSON } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[0].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: false
	},
	{
		reference: 'F0956-2CF1F',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-01-27T16:46:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[11].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.PERSON } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[1].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.REJECTED } },
		containsAttachments: false
	},
	{
		reference: 'C96A4-ECEB9',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-02T09:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[12].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.PERSON } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[2].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: 'AD888-F0C29',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-01T18:19:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[13].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.PERSON } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[3].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '554C0-F041A',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-01T14:31:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[14].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.PERSON } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[4].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '8479A-8FA79',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T07:50:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[15].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[5].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '71282-6A474',
		comment: 'Some comment about this application',
		commentRedacted: 'Some ███████ about this application',
		submittedDate: new Date('2025-02-03T08:14:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[16].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		submittedByAgent: true,
		submittedByAgentOrgName: 'Consultancy One Ltd.',
		RepresentedContact: { connect: { id: repsBehalfOfContacts[6].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: false
	},
	{
		reference: '1D5AA-CF9D3',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-01-26T22:03:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[17].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		submittedByAgent: true,
		submittedByAgentOrgName: 'Consultancy Seven Ltd.',
		RepresentedContact: { connect: { id: repsBehalfOfContacts[7].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: 'E7A93-F3D48',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-01-30T18:16:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[18].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[8].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		containsAttachments: false
	},
	{
		reference: '80831-C32AC',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-02T15:56:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[19].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR } },
		RepresentedContact: { connect: { id: repsBehalfOfContacts[9].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: false
	}
];

// all the old rep references, to be mapped to the new format XXXXX-YYYYY
const oldRepReferences = [
	'5031-5316-3D51-66E3',
	'4705-B405-AD6A-069E',
	'A9BC-3915-FDF0-6878',
	'1295-C726-E8AB-36F4',
	'ADE3-E60E-0C99-E01B',
	'7806-3E19-BBBC-CEEF',
	'6EFB-4E9C-8B6B-040F',
	'FA0F-1C40-19CB-E6C1',
	'3368-30DE-BE9A-126E',
	'1E11-CC92-E6D8-FF71',
	'9D82-748F-3788-5B87',
	'F095-62CF-1FB7-645D',
	'C96A-4ECE-B9B4-F52C',
	'AD88-8F0C-2986-DBB0',
	'554C-0F04-1A2F-155E',
	'8479-A8FA-798A-B0A2',
	'7128-26A4-74A2-8029',
	'1D5A-ACF9-D357-0A7C',
	'E7A9-3F3D-48D7-1EB5',
	'8083-1C32-ACB0-BFFB'
];

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
		await dbClient.representation.upsert({
			where: { reference: representation.reference },
			create: representation,
			update: representation
		});
	}

	console.log('dev seed complete');
}

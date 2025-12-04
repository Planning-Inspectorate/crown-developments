import { faker } from '@faker-js/faker';
import {
	APPLICATION_UPDATE_STATUS_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from './data-static.js';

export const representationContactAddresses = [
	{
		id: '7e238942-71b5-42b3-92c3-5be987cd1b2f',
		line1: '10 Elm Street',
		line2: null,
		townCity: 'Manchester',
		county: null,
		postcode: 'M1 1AB'
	},
	{
		id: 'b6b56a2c-314a-458e-bf1b-9a3f834c0673',
		line1: '45 Oak Lane',
		line2: 'Flat 2',
		townCity: 'Birmingham',
		county: null,
		postcode: 'B1 2CD'
	},
	{
		id: 'fc397169-0bc3-4d57-8c3c-63e5288e1de4',
		line1: '78 Maple Avenue',
		line2: null,
		townCity: 'Leeds',
		county: 'West Yorkshire',
		postcode: 'LS1 4EF'
	},
	{
		id: '5d97e8ca-8ef1-4a3b-b329-a84f27ec7adb',
		line1: '22 Pine Crescent',
		line2: 'Suite 4',
		townCity: 'Liverpool',
		county: null,
		postcode: 'L1 6GH'
	},
	{
		id: 'c58a3840-8b5b-4f22-8872-d768b034cd7a',
		line1: '9 Willow Way',
		line2: null,
		townCity: 'London',
		county: null,
		postcode: 'E1 2IJ'
	},
	{
		id: '9ea5b2a9-36ab-4ac8-8cb0-728b6d94f675',
		line1: '30 Ash Court',
		line2: 'Building A',
		townCity: 'Sheffield',
		county: 'South Yorkshire',
		postcode: 'S1 3KL'
	},
	{
		id: '418a8c9c-1cb9-418b-a7ef-f244c573ca2b',
		line1: '16 Cedar Close',
		line2: null,
		townCity: 'Newcastle',
		county: null,
		postcode: 'NE1 5MN'
	},
	{
		id: 'c8f4d38f-9c09-4f12-8692-3dcf8cbb7e2d',
		line1: '55 Birch Terrace',
		line2: 'Apartment 5B',
		townCity: 'Brighton',
		county: null,
		postcode: 'BN1 1OP'
	},
	{
		id: 'e24d2bae-8dbc-48a4-b197-977eeb4e813d',
		line1: '34 Fir View',
		line2: null,
		townCity: 'Bristol',
		county: null,
		postcode: 'BS1 2QR'
	},
	{
		id: 'f9726c49-a1f5-41f9-9525-3eaf8e8099d0',
		line1: '12 Holly Gardens',
		line2: 'Ground Floor',
		townCity: 'Cardiff',
		county: null,
		postcode: 'CF1 4ST'
	},
	{
		id: '87d95c5b-a2d7-4f2b-a81c-6a5e079c612b',
		line1: '67 Ivy Walk',
		line2: null,
		townCity: 'Edinburgh',
		county: 'Midlothian',
		postcode: 'EH1 2UV'
	},
	{
		id: 'edaef953-7388-4602-a14a-3a9d9d2be1bf',
		line1: '89 Laurel Park',
		line2: 'Flat 10',
		townCity: 'Glasgow',
		county: null,
		postcode: 'G1 3WX'
	},
	{
		id: 'db47e9cf-b8a9-4fa8-8dcd-48ca96a9be96',
		line1: '33 Chestnut Hill',
		line2: null,
		townCity: 'Oxford',
		county: null,
		postcode: 'OX1 4YZ'
	}
];
/**
 * @param {import('@pins/crowndev-database').PrismaClient} dbClient
 * @param {import('@pins/crowndev-database').Prisma.RepresentationCreateInput} representation
 */
export async function persistWrittenRepresentation(dbClient, representation) {
	await dbClient.representation.upsert({
		where: { reference: representation.reference },
		create: representation,
		update: representation
	});
}

/**
 * @param {string} reference
 * @returns {import('@pins/crowndev-database').Prisma.RepresentationCreateInput}
 */
export function generateWrittenRepresentation(reference) {
	return {
		reference: reference,
		comment: faker.lorem.sentence(),
		commentRedacted: null,
		submittedDate: faker.date.past(),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[19].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR } },
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[9].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: false
	};
}

/**
 * @returns {string} randomly generated representation reference
 */
export function generateRandomRepresentationReference() {
	return `${faker.string.alphanumeric(5).toUpperCase()}-${faker.string.alphanumeric(5).toUpperCase()}`;
}

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@pins/crowndev-database').Prisma.ContactCreateInput[]}
 */
export const repsContacts = [
	{
		id: '05fa5f0f-342d-466d-8d61-e837586d6a3d',
		firstName: 'Person',
		lastName: 'One',
		email: 'person-one@example.com',
		contactPreferenceId: 'email'
	},
	{
		id: 'b4654a6b-7ab1-4391-8e81-839809b0dfb0',
		firstName: 'Person',
		lastName: 'Two',
		addressId: '7e238942-71b5-42b3-92c3-5be987cd1b2f',
		contactPreferenceId: 'post'
	},
	{
		id: 'afb9d282-0db0-4fbd-a9f9-90c13f1e3cd0',
		firstName: 'Person',
		lastName: 'Three',
		email: 'person-three@example.com',
		contactPreferenceId: 'email'
	},
	{
		id: '1bb4a1c8-d068-4d75-bcaa-9dc0e33ac1ee',
		firstName: 'Person',
		lastName: 'Four',
		addressId: 'b6b56a2c-314a-458e-bf1b-9a3f834c0673',
		contactPreferenceId: 'post'
	},
	{
		id: 'c98304bd-5607-4819-9bd2-9af51d9b419f',
		firstName: 'Person',
		lastName: 'Five',
		email: 'person-five@example.com',
		contactPreferenceId: 'email'
	},
	{
		id: '14c92bd0-8457-480d-8b10-a3fb6c0fd372',
		firstName: 'Person',
		lastName: 'Six',
		jobTitleOrRole: 'Chief Commenter',
		addressId: 'fc397169-0bc3-4d57-8c3c-63e5288e1de4',
		contactPreferenceId: 'post'
	},
	{
		id: '5636f842-3263-4a27-9b83-86229ae1dd67',
		firstName: 'Person',
		lastName: 'Seven',
		jobTitleOrRole: 'Manager',
		addressId: '5d97e8ca-8ef1-4a3b-b329-a84f27ec7adb',
		contactPreferenceId: 'post'
	},
	{
		id: 'c3b722e6-afba-4a9f-87f1-96db55e145c1',
		firstName: 'Person',
		lastName: 'Eight',
		email: 'person-eight@example.com',
		jobTitleOrRole: 'Planning Person',
		contactPreferenceId: 'email'
	},
	{
		id: '30925c6a-d50d-40a9-93e3-b6b7a3ff2fbb',
		firstName: 'Person',
		lastName: 'Nine',
		jobTitleOrRole: 'Representative',
		addressId: 'c58a3840-8b5b-4f22-8872-d768b034cd7a',
		contactPreferenceId: 'post'
	},
	{
		id: 'f589adb8-73e2-4562-86ce-bd81fc33d2af',
		firstName: 'Person',
		lastName: 'Ten',
		jobTitleOrRole: 'Community Spokesperson',
		addressId: '9ea5b2a9-36ab-4ac8-8cb0-728b6d94f675',
		contactPreferenceId: 'post'
	},
	{
		id: '0af835c0-8ed1-46a1-b43f-665fc062b1ed',
		firstName: 'Person',
		lastName: 'Eleven',
		email: 'person-eleven@example.com',
		contactPreferenceId: 'email'
	},
	{
		id: 'd75f3116-945e-44a4-bffd-4cd36d1cc968',
		firstName: 'Person',
		lastName: 'Twelve',
		addressId: '418a8c9c-1cb9-418b-a7ef-f244c573ca2b',
		contactPreferenceId: 'post'
	},
	{
		id: '61700b0a-2251-4779-ba3d-6b0cb9d034a9',
		firstName: 'Person',
		lastName: 'Thirteen',
		email: 'person-thirteen@example.com',
		contactPreferenceId: 'email'
	},
	{
		id: 'e1f12f5b-4107-456d-8ab1-ca7b4b8e114a',
		firstName: 'Person',
		lastName: 'Fourteen',
		addressId: 'c8f4d38f-9c09-4f12-8692-3dcf8cbb7e2d',
		contactPreferenceId: 'post'
	},
	{
		id: 'cda925f4-2393-454c-8381-f07b2332547b',
		firstName: 'Person',
		lastName: 'Fifteen',
		addressId: 'e24d2bae-8dbc-48a4-b197-977eeb4e813d',
		contactPreferenceId: 'post'
	},
	{
		id: 'b084ed4d-d835-4b49-9a4f-cb25bb36a445',
		firstName: 'Person',
		lastName: 'Sixteen',
		email: 'person-sixteen@example.com',
		contactPreferenceId: 'email'
	},
	{
		id: '98b8b7c1-598d-4fd7-b5f1-f160528cb3b5',
		firstName: 'Person',
		lastName: 'Seventeen',
		addressId: 'f9726c49-a1f5-41f9-9525-3eaf8e8099d0',
		contactPreferenceId: 'post'
	},
	{
		id: '9cbc1386-e4bb-4dbe-a6d2-c6f2189449c3',
		firstName: 'Person',
		lastName: 'Eighteen',
		addressId: '87d95c5b-a2d7-4f2b-a81c-6a5e079c612b',
		contactPreferenceId: 'post'
	},
	{
		id: '35f252df-48f6-416a-97c3-b4cf2985c459',
		firstName: 'Person',
		lastName: 'Nineteen',
		addressId: 'edaef953-7388-4602-a14a-3a9d9d2be1bf',
		contactPreferenceId: 'post'
	},
	{
		id: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84',
		firstName: 'Person',
		lastName: 'Twenty',
		addressId: 'db47e9cf-b8a9-4fa8-8dcd-48ca96a9be96',
		contactPreferenceId: 'post'
	}
];

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@pins/crowndev-database').Prisma.ContactCreateInput[]}
 */
export const repsOnBehalfOfOrgContacts = [
	{ id: 'c561a9bb-a1c4-4836-9f6f-0ea904c79475', orgName: 'Org One' },
	{ id: '1d421817-caa1-40e7-9f6c-e915309707c1', orgName: 'Org Two' },
	{ id: 'f4a79154-a216-4263-81b1-2a8660e63376', orgName: 'Org Three' },
	{ id: '595a08cf-ee0e-4118-b75d-e5b4ea1ab812', orgName: 'Charity One' },
	{ id: 'f9c46547-c6b9-4be3-9140-3f6ff308a5ed', orgName: 'Charity Two' }
];

/**
 * IDs here are just generated GUIDs
 * (e.g. run `node -e "console.log(require('crypto').randomUUID())"'`)
 * @type {import('@pins/crowndev-database').Prisma.ContactCreateInput[]}
 */
export const repsBehalfOfPersonContacts = [
	{ id: '7c3619fb-81ff-4164-8edb-8baae3dfc087', firstName: 'Person', lastName: 'Alpha' },
	{ id: 'f48bc3e9-87b2-4d9e-ad49-2fc48a48472f', firstName: 'Person', lastName: 'Beta' },
	{ id: '562997bd-b50a-4902-8601-d0b347c839c3', firstName: 'Person', lastName: 'Gamma' },
	{ id: 'df65db2c-e644-4065-88a5-81e673ebd714', firstName: 'Person', lastName: 'Delta' },
	{ id: '94a2a7ce-2c97-460e-adc3-0b019c1ef470', firstName: 'Person', lastName: 'Epsilon' },
	{ id: 'b874a850-0264-4ac4-a52d-fddfa05b4a1f', firstName: 'Person', lastName: 'Zeta' },
	{ id: 'd5a3a6a5-4809-41fc-8367-672ed57f6076', firstName: 'Person', lastName: 'Eta' },
	{ id: 'a7bd8186-6913-49f3-862e-18c38e615f2e', firstName: 'Person', lastName: 'Theta' },
	{ id: '9a9b7479-6fde-49ae-9c9f-e1b553bea904', firstName: 'Person', lastName: 'Iota' },
	{ id: '8aa7a2ad-ff79-4355-a436-46e557971bb9', firstName: 'Person', lastName: 'Kappa' }
];

export const repReferences = [
	'84F02-B6D74',
	'C6A72-D1B04',
	'3D9F2-B8C10',
	'7C91B-A62F9',
	'1A2D3-F5B80',
	'D9F73-C8A16',
	'E3B94-F5D67',
	'A6F10-C7B24',
	'98B24-D1F39',
	'F1A72-B3C65',
	'5C29B-D8F13',
	'0A82F-C6B17',
	'B4D70-A9C81',
	'D2B4F-F0C30',
	'C2A11-A8B03',
	'F4B92-A6E77',
	'A7F03-C0D89',
	'6B92D-B9C52',
	'2F3C1-C1F22',
	'7D6E4-D3A92',
	'E2C19-F4B70',
	'B9D32-A2C10',
	'8A74C-C1E01',
	'6B92F-D5A84',
	'3F09B-A0D66',
	'7E24F-C2B70',
	'9C7A2-B9F45',
	'E0B13-C8D65',
	'5C62A-D9F71',
	'A9C32-F2B85',
	'F0D12-B7C53',
	'3A92B-D5F17',
	'E8C21-F0A84',
	'2B16F-C3D07',
	'1F82C-A7E22',
	'6D01B-B8C11',
	'9A72D-C1F83',
	'7C03F-B0E54',
	'F1C50-D3A92',
	'B5A60-C9D10',
	'3D61C-B7E80',
	'0F8A1-C3D20',
	'4A72B-B9F50',
	'D2C61-B8F94',
	'79A35-F1B06'
];

/**
 * References here are generated with generateNewReference function in have-your-say
 * @type {import('@pins/crowndev-database').Prisma.RepresentationCreateInput[]}
 */
export const representations = [
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
		Status: { connect: { id: REPRESENTATION_STATUS_ID.WITHDRAWN } },
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
		containsAttachments: false,
		sharePointFolderCreated: true
	},
	{
		reference: 'ADE3E-60E0C',
		comment: 'Some comment about this application',
		commentRedacted: null,
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
		SubmittedByContact: { connect: { id: repsContacts[4].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.WITHDRAWN } },
		containsAttachments: false,
		sharePointFolderCreated: true
	},
	{
		reference: '78063-E19BB',
		comment: 'Some comment about this application',
		commentRedacted: 'Some ███████ about this application',
		submittedDate: new Date('2025-02-03T10:32:00.000Z'),
		SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
		SubmittedByContact: { connect: { id: repsContacts[5].id } },
		RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
		RepresentedContact: { connect: { id: repsOnBehalfOfOrgContacts[0].id } },
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
		RepresentedContact: { connect: { id: repsOnBehalfOfOrgContacts[1].id } },
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
		RepresentedContact: { connect: { id: repsOnBehalfOfOrgContacts[2].id } },
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
		RepresentedContact: { connect: { id: repsOnBehalfOfOrgContacts[3].id } },
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
		RepresentedContact: { connect: { id: repsOnBehalfOfOrgContacts[4].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[0].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[1].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[2].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[3].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[4].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[5].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[6].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[7].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[8].id } },
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
		RepresentedContact: { connect: { id: repsBehalfOfPersonContacts[9].id } },
		Status: { connect: { id: REPRESENTATION_STATUS_ID.ACCEPTED } },
		containsAttachments: false
	}
];

export const representationDocuments = [
	{
		id: 'c1b2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6',
		Representation: { connect: { reference: representations[3].reference } },
		itemId: '012D6AZFCTLSY4ZGSEIRBLARPIZRLDVHZA',
		redactedItemId: null,
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		fileName: 'representation-document-1.pdf'
	},
	{
		id: 'f7a8b9c0-d1e2-f3a4-b5c6-d7e8f9a0b1c2',
		Representation: { connect: { reference: representations[3].reference } },
		itemId: '012D6AZFDZZ52YWWBQK5HZDN3WLMN3CN2I',
		redactedItemId: null,
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		fileName: 'representation-document-2.pdf'
	},
	{
		id: 'a3b4c5d6-e7f8-9a0b-c1d2-e3f4a5b6c7d8',
		Representation: { connect: { reference: representations[4].reference } },
		itemId: '012D6AZFGUHSIXAK7X75E3JDTSQE32IXII',
		redactedItemId: null,
		Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
		fileName: 'representation-document-3.pdf'
	}
];

export const applicationUpdates = [
	{
		id: 'fa5cb811-1d12-4674-b409-43b1c0a8609e',
		details: 'An application update',
		lastEdited: new Date('2024-02-03T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '0bc0e072-49c1-4b33-8b9f-e9924132fa1b',
		details: 'An application update',
		lastEdited: new Date('2025-04-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2024-02-01T15:56:00.000Z')
	},
	{
		id: 'e7b1d04f-8ceb-4746-9d57-bf5f0ec04350',
		details: 'An application update',
		lastEdited: new Date('2025-07-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.DRAFT } }
	},
	{
		id: '0976c0e7-8c2d-46ca-99cc-c633401ac5d4',
		details: 'An application update',
		lastEdited: new Date('2025-01-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED } },
		firstPublished: new Date('2024-12-01T15:56:00.000Z')
	},
	{
		id: '86ac4c85-5dde-4cd5-a686-b2bde856cb18',
		details: 'An application update',
		lastEdited: new Date('2025-02-14T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '8b3f79e6-9be1-47fb-b5ee-aaf3353d177e',
		details: 'An application update',
		lastEdited: new Date('2025-02-18T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.DRAFT } }
	},
	{
		id: '8410845d-0bc0-45f0-bfaa-5a7e89520a79',
		details: 'An application update',
		lastEdited: new Date('2025-02-25T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.DRAFT } }
	},
	{
		id: '6b72ef51-ca5d-4831-9609-7e93126ba177',
		details: 'An application update',
		lastEdited: new Date('2025-03-28T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-03-01T15:56:00.000Z')
	},
	{
		id: '76dd75b2-ff5d-4305-9f8b-6b495ba263d0',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '06151e41-5d16-449f-9d3a-1572a6a6ca6f',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '411241fd-16b3-48c8-8311-a2f3b6ec28ec',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'be4c6090-af70-4569-aff7-baf76f3feb4a',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'd4f4df8f-a853-46fa-bf36-1ef32d981cbd',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'de11c8d3-afcf-4107-88c8-d2d635d5880a',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '15071967-4fdd-412f-adf8-fbc730ef9ed3',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'd3de31e8-241d-42f1-a17e-d49cf63bf175',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'fa2967c1-138e-4c90-8a7f-a26b8a35fe5b',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '9f2bcc65-a262-4eb8-92bd-a0690403126c',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '0d8a2f51-6e2d-4d1d-aeee-61c6b91d0371',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '12cfbd7f-75cd-4e95-8118-b1900d3ce3ab',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'a10a9ccf-7af0-43f2-8ced-a9f903fb074d',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'cb8a9786-2a55-4c47-aecc-a665d6095f7b',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '3adc1894-d421-462c-8b6a-5555b6dcf091',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'e57dec57-523d-4284-af99-f28c97d690a6',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '853bc3f6-5d50-466c-9af1-a9b8f37ff0e1',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '38d13eb0-0dcb-48f4-a264-911088875228',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'be5ba643-2601-4bf9-b262-d4c14413bdd1',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '51fc089c-5c56-46a5-bd81-511099dcdc68',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '4a335c9f-0731-4419-b462-1d181a940d20',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '29f4f1c5-cd75-4d8e-b528-fcbada753b4f',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '187a0e39-84b7-40c6-99bc-cb97c605fdd8',
		details: 'An application update',
		lastEdited: new Date('2025-02-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: '7d959d0e-f9db-4000-9adb-084ad8edef16',
		details: 'An application update',
		lastEdited: new Date('2025-08-11T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.DRAFT } }
	},
	{
		id: '3fb61b90-57ef-4512-849e-b28f81edc83e',
		details: 'An application update',
		lastEdited: new Date('2025-08-14T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-02-01T15:56:00.000Z')
	},
	{
		id: 'cbbd9300-e19f-4877-b25f-26b4a7202c7f',
		details: 'An application update',
		lastEdited: new Date('2025-08-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.DRAFT } }
	},
	{
		id: 'f3a06a5b-c66b-479a-bc1d-a3b918255179',
		details: 'An application update',
		lastEdited: new Date('2025-04-02T15:56:00.000Z'),
		Status: { connect: { id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED } },
		firstPublished: new Date('2025-03-30T15:56:00.000Z')
	}
];

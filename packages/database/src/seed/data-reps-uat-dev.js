import {
	APPLICATION_STATUS,
	APPLICATION_TYPE_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from './data-static.js';
import { faker } from '@faker-js/faker';
/**
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @returns {Promise<void>}
 */
export async function seedUatCases(db) {
	const lpa = await db.lpa.findFirst();

	const names = [
		faker.person.fullName(),
		faker.person.fullName(),
		faker.person.fullName(),
		faker.person.fullName(),
		faker.person.fullName()
	];
	const orgNames = [
		faker.company.name(),
		faker.company.name(),
		faker.company.name(),
		faker.company.name(),
		faker.company.name()
	];
	const dates = [
		faker.date.recent({ days: 20 }),
		faker.date.recent({ days: 20 }),
		faker.date.recent({ days: 20 }),
		faker.date.recent({ days: 20 }),
		faker.date.recent({ days: 20 })
	];
	dates.sort((a, b) => a - b);

	await db.$transaction(async ($tx) => {
		for (let i = 1; i < 6; i++) {
			await seedCaseAndReps($tx, i, lpa.id, names, orgNames, dates);
		}
	});
}

/**
 * @param {import('@prisma/client').PrismaClient} db
 * @param {number} index
 * @param {string} lpaId
 * @param {string[]} names
 * @param {string[]} orgNames
 * @param {Date[]} dates
 * @returns {Promise<void>}
 */
async function seedCaseAndReps(db, index, lpaId, names, orgNames, dates) {
	// ensure there is a case to link representations to
	/** @type {import('@prisma/client').Prisma.CrownDevelopmentCreateInput} */
	const data = {
		reference: `CROWN/2025/000005${index}`,
		Type: { connect: { id: APPLICATION_TYPE_ID.PLANNING_PERMISSION } },
		Status: { connect: { id: APPLICATION_STATUS[0].id } },
		Lpa: { connect: { id: lpaId } },
		ApplicantContact: { create: { fullName: 'Applicant One' } },
		description: 'An application for a development',
		expectedDateOfSubmission: new Date('2025-06-25T23:00:00Z')
	};
	const crownDev = await db.crownDevelopment.upsert({
		where: { reference: data.reference },
		create: data,
		update: data
	});

	// myself over 18
	await db.representation.create({
		data: {
			Application: { connect: { id: crownDev.id } },
			reference: generateRef(index, 1),
			Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			comment: faker.lorem.sentence(),
			commentRedacted: null,
			submittedDate: dates[0],
			SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
			SubmittedByContact: {
				create: { fullName: names[0], isAdult: true, email: faker.internet.email({ provider: 'fake.example.com' }) }
			}
		}
	});

	// myself under 18
	await db.representation.create({
		data: {
			Application: { connect: { id: crownDev.id } },
			reference: generateRef(index, 2),
			Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			comment: faker.lorem.sentence(),
			commentRedacted: null,
			submittedDate: dates[1],
			SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } },
			SubmittedByContact: { create: { isAdult: false, email: faker.internet.email({ provider: 'fake.example.com' }) } }
		}
	});

	// On behalf of - Individual
	await db.representation.create({
		data: {
			Application: { connect: { id: crownDev.id } },
			reference: generateRef(index, 3),
			Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			comment: faker.lorem.sentence(),
			commentRedacted: null,
			submittedDate: dates[2],
			SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
			SubmittedByContact: {
				create: { isAdult: true, fullName: names[1], email: faker.internet.email({ provider: 'fake.example.com' }) }
			},
			RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.PERSON } },
			RepresentedContact: { create: { isAdult: true, fullName: names[2] } }
		}
	});

	// On behalf of - Organisation I work for - Agent 18 over, acting on behalf of a client = Yes
	await db.representation.create({
		data: {
			Application: { connect: { id: crownDev.id } },
			reference: generateRef(index, 4),
			Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			comment: faker.lorem.sentence(),
			commentRedacted: null,
			submittedDate: dates[3],
			SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
			SubmittedByContact: {
				create: { isAdult: true, fullName: names[3], email: faker.internet.email({ provider: 'fake.example.com' }) }
			},
			RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORGANISATION } },
			RepresentedContact: { create: { fullName: orgNames[0] } },
			submittedByAgent: true,
			submittedByAgentOrgName: orgNames[1]
		}
	});

	// On behalf of - Organisation I do not work for, Agent under 18, acting on behalf of a client = No
	await db.representation.create({
		data: {
			Application: { connect: { id: crownDev.id } },
			reference: generateRef(index, 5),
			Status: { connect: { id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			comment: faker.lorem.sentence(),
			commentRedacted: null,
			submittedDate: dates[4],
			SubmittedFor: { connect: { id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF } },
			SubmittedByContact: { create: { isAdult: false, email: faker.internet.email({ provider: 'fake.example.com' }) } },
			RepresentedType: { connect: { id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR } },
			RepresentedContact: { create: { fullName: orgNames[2] } },
			submittedByAgent: false
		}
	});
}
/**
 * @param {number} group
 * @param {number} id
 * @returns {string} randomly generated representation reference
 */
function generateRef(group, id) {
	return `${faker.string.alphanumeric(5).toUpperCase()}-${faker.string.alphanumeric(3).toUpperCase()}${group}${id}`;
}

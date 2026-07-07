import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { S62aCaseMapper, type CreateCaseAnswers } from './s62a-case-mapper.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPE_ID,
	S62A_STATUS_ID,
	SITE_AREA_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

describe('S62aCaseMapper', () => {
	const reference = 'S62A/2026/0000001';
	let baseAnswers: CreateCaseAnswers;

	beforeEach(() => {
		baseAnswers = {
			applicationType: 'planning-permission',
			lpaId: 'lpa-123',
			developmentDescription: 'A base test development',
			expectedSubmissionDate: '2026-02-01T00:00:00.000Z',
			hasAgent: 'no'
		};
	});

	describe('Validation', () => {
		it('throws an error if applicationType is missing', () => {
			// We must cast to something here so that we can remove a mandatory field.
			delete (baseAnswers as any).applicationType;
			const mapper = new S62aCaseMapper(baseAnswers, reference);

			assert.throws(
				() => {
					mapper.generateCreateInput();
				},
				{
					message: 'Cannot create S62aCase: missing required applicationType'
				}
			);
		});

		it('throws an error if lpaId is missing', () => {
			// We must cast to something here so that we can remove a mandatory field.
			delete (baseAnswers as any).lpaId;
			const mapper = new S62aCaseMapper(baseAnswers, reference);

			assert.throws(
				() => {
					mapper.generateCreateInput();
				},
				{
					message: 'Cannot create S62aCase: missing required lpaId'
				}
			);
		});

		it('throws an error if an applicant contact is orphaned (organisation not found)', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				applicantType: APPLICANT_TYPE_ID.ORGANISATION,
				manageApplicantOrganisations: [{ id: 'org-1', organisationName: 'Valid Org' }],
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'test@test.com', applicantContactOrganisation: 'invalid-org-id' }
				]
			};
			const mapper = new S62aCaseMapper(answers, reference);

			assert.throws(
				() => {
					mapper.generateCreateInput();
				},
				{
					message: 'Found an orphaned contact with selector "invalid-org-id": test@test.com'
				}
			);
		});

		it('throws an error if hasAgent is true but agent contacts are missing', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				hasAgent: 'yes',
				agentName: 'Agents 1'
			};
			const mapper = new S62aCaseMapper(answers, reference);

			assert.throws(() => mapper.generateCreateInput(), {
				message: 'Agent contacts are required when the case has an agent'
			});
		});

		it('throws an error if hasAgent is true but agent name is missing', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				hasAgent: 'yes',
				manageAgentContactDetails: [{ agentFirstName: 'Bob', agentContactEmail: 'bob@mail.com' }]
			};
			const mapper = new S62aCaseMapper(answers, reference);

			assert.throws(() => mapper.generateCreateInput(), {
				message: 'Agent name is required when the case has an agent'
			});
		});
	});

	describe('Scalar and Lookup Mapping', () => {
		it('maps basic case details and lookups correctly', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				developmentDescription: 'A test development',
				hasAgent: 'no',
				hasSecondaryLpa: 'no',
				applicationClassification: 'major',
				applicationPhase: 'application',
				siteEasting: '123456',
				siteNorthing: '654321',
				notificationSubmittedDate: '2026-01-01T00:00:00.000Z',
				expectedSubmissionDate: '2026-02-01T00:00:00.000Z'
			};

			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			assert.strictEqual(result.reference, 'S62A/2026/0000001');
			assert.strictEqual(result.description, 'A test development');
			assert.strictEqual(result.hasAgent, false);
			assert.strictEqual(result.hasSecondaryLpa, false);
			assert.deepStrictEqual(result.Type, { connect: { id: 'planning-permission' } });
			assert.deepStrictEqual(result.Lpa, { connect: { id: 'lpa-123' } });
			assert.deepStrictEqual(result.Classification, { connect: { id: 'major' } });
			assert.deepStrictEqual(result.ApplicationPhase, { connect: { id: 'application' } });
			assert.strictEqual(result.siteEasting, 123456);
			assert.strictEqual(result.siteNorthing, 654321);

			assert.strictEqual(
				(result.notificationSubmittedDate as Date)?.getTime(),
				new Date('2026-01-01T00:00:00.000Z').getTime()
			);
			assert.strictEqual(
				(result.expectedSubmissionDate as Date)?.getTime(),
				new Date('2026-02-01T00:00:00.000Z').getTime()
			);

			assert.deepStrictEqual(result.S62aStatus, { connect: { id: S62A_STATUS_ID.NEW } });
		});
	});

	describe('Address Mapping', () => {
		it('maps site address correctly using toAddressInput', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				siteAddress: {
					addressLine1: '1 High Street',
					addressLine2: 'Floor 2',
					townCity: 'Bristol',
					county: 'Avon',
					postcode: 'BS1 1AA'
				}
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			assert.deepStrictEqual(result.SiteAddress, {
				create: {
					line1: '1 High Street',
					line2: 'Floor 2',
					townCity: 'Bristol',
					county: 'Avon',
					postcode: 'BS1 1AA'
				}
			});
		});
	});

	describe('Site Area Conversion', () => {
		it('maps site area from square metres to hectares using Prisma.Decimal', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				siteAreaSquareMetres: '50000'
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			// Using toString() because Prisma.Decimal is a complex object
			assert.strictEqual(result.siteAreaInHectares?.toString(), '5');
			assert.deepStrictEqual(result.SiteAreaOriginalUnit, { connect: { id: SITE_AREA_UNIT_ID.METRES_SQUARED } });
		});

		it('maps site area using hectares directly using Prisma.Decimal', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				siteAreaHectares: '12.5'
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			assert.strictEqual(result.siteAreaInHectares?.toString(), '12.5');
			assert.deepStrictEqual(result.SiteAreaOriginalUnit, { connect: { id: SITE_AREA_UNIT_ID.HECTARES } });
		});
	});

	describe('LPA Contacts', () => {
		it('maps primary and secondary LPA contacts', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				lpaFirstName: 'John',
				lpaLastName: 'Doe',
				lpaEmailAddress: 'john@lpa.gov.uk',
				hasSecondaryLpa: 'yes',
				secondaryLpaId: 'lpa-secondary-456',
				secondaryLpaFirstName: 'Jane',
				secondaryLpaLastName: 'Smith'
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			assert.deepStrictEqual(result.LpaContact, {
				create: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@lpa.gov.uk',
					telephoneNumber: undefined
				}
			});

			assert.deepStrictEqual(result.SecondaryLpa, { connect: { id: 'lpa-secondary-456' } });
			assert.deepStrictEqual(result.SecondaryLpaContact, {
				create: {
					firstName: 'Jane',
					lastName: 'Smith',
					email: undefined,
					telephoneNumber: undefined
				}
			});
		});
	});

	describe('Applicants and Agents (Exclusive Arc)', () => {
		it('maps agent details correctly', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				hasAgent: 'yes',
				agentName: 'Super Agents Ltd',
				manageAgentContactDetails: [{ agentFirstName: 'Bob', agentContactEmail: 'bob@agent.com' }]
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			const applicantsToCreate = result.S62aToApplicants?.create as Prisma.S62aToApplicantCreateInput[];
			assert.ok(applicantsToCreate, 'S62aToApplicants.create array should exist');
			assert.strictEqual(applicantsToCreate.length, 1);

			const agentEntry = applicantsToCreate[0];
			assert.deepStrictEqual(agentEntry.Role, { connect: { id: ORGANISATION_ROLES_ID.AGENT } });
			assert.strictEqual(agentEntry.Organisation?.create?.name, 'Super Agents Ltd');
			assert.strictEqual(agentEntry.Organisation.create.Address, undefined);

			const linkedContacts = agentEntry?.Organisation?.create?.OrganisationToContact
				?.create as Prisma.OrganisationToContactCreateInput[];
			assert.strictEqual(linkedContacts?.length, 1);
			assert.deepStrictEqual(linkedContacts[0].Contact.create, {
				firstName: 'Bob',
				lastName: null,
				email: 'bob@agent.com',
				telephoneNumber: null
			});
		});

		it('maps individual applicant correctly without an organisation', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				applicantType: 'individual',
				manageApplicantContactDetails: [{ applicantFirstName: 'Alice', applicantContactEmail: 'alice@test.com' }]
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			const applicantsToCreate = result.S62aToApplicants?.create as Prisma.S62aToApplicantCreateInput[];
			assert.ok(applicantsToCreate, 'S62aToApplicants.create array should exist');
			assert.strictEqual(applicantsToCreate.length, 1);

			const individualEntry = applicantsToCreate[0];
			assert.deepStrictEqual(individualEntry.Role, { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } });
			assert.strictEqual(
				individualEntry.Organisation,
				undefined,
				'Organisation should not exist on an individual applicant path'
			);
			assert.deepStrictEqual(individualEntry?.Contact?.create, {
				firstName: 'Alice',
				lastName: null,
				email: 'alice@test.com',
				telephoneNumber: null
			});
		});

		it('maps organisation applicant with linked contacts correctly', () => {
			const answers: CreateCaseAnswers = {
				...baseAnswers,
				applicantType: APPLICANT_TYPE_ID.ORGANISATION,
				manageApplicantOrganisations: [{ id: 'org-1', organisationName: 'Big Corp' }],
				manageApplicantContactDetails: [{ applicantFirstName: 'CEO', applicantContactOrganisation: 'org-1' }]
			};
			const mapper = new S62aCaseMapper(answers, reference);
			const result = mapper.generateCreateInput();

			const applicantsToCreate = result.S62aToApplicants?.create as Prisma.S62aToApplicantCreateInput[];
			assert.ok(applicantsToCreate, 'S62aToApplicants.create array should exist');
			assert.strictEqual(applicantsToCreate.length, 1);

			const orgEntry = applicantsToCreate[0];
			assert.deepStrictEqual(orgEntry.Role, { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } });
			assert.strictEqual(
				orgEntry.Contact,
				undefined,
				'Contact should not exist directly on an organisation applicant path'
			);

			assert.strictEqual(orgEntry?.Organisation?.create?.name, 'Big Corp');

			const linkedContacts = orgEntry.Organisation.create.OrganisationToContact
				?.create as Prisma.OrganisationToContactCreateInput[];
			assert.strictEqual(linkedContacts.length, 1);
			assert.deepStrictEqual(linkedContacts[0].Contact.create, {
				firstName: 'CEO',
				lastName: null,
				email: null,
				telephoneNumber: null
			});
		});
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	APPLICATION_TYPES,
	APPLICATION_SUB_TYPES,
	APPLICATION_STATUS,
	APPLICATION_STAGE,
	APPLICATION_STAGE_ID,
	CATEGORIES,
	APPLICATION_DECISION_OUTCOME,
	APPLICATION_PROCEDURE_ID,
	APPLICATION_TYPE_ID,
	APPLICATION_SUB_TYPE_ID,
	APPLICATION_STATUS_ID,
	ORGANISATION_ROLES_ID,
	CONTACT_PREFERENCE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { CASE_TYPE } from '@pins/crowndev-lib/odw/odw-publisher.ts';
import { getCachedAjv } from '@pins/crowndev-lib/odw/cached-ajv.ts';
import { mapCrownDevelopmentToOdwSchema } from './crown-development.mapper.ts';
import type { CrownDevelopmentOdwPayload } from './crown-development.mapper.ts';

const SCHEMA_ID = 'applications-crowndev-application.schema.json';
const BASE_DATE = new Date('2026-01-15T10:00:00.000Z');
const TEST_DATE = new Date('2026-06-30T09:30:00.000Z');

type Payload = CrownDevelopmentOdwPayload;
type OrganisationPayload = Payload['Organisations'][number];
type EventPayload = NonNullable<Payload['Event']>;

function buildAddress(id = 'CCCCCCCC-1234-1234-1234-CCCCCCCCCCCC') {
	return { id, line1: '1 High Street', line2: 'Flat 2', townCity: 'Bristol', county: 'Avon', postcode: 'BS1 6PN' };
}

function buildOrganisation(overrides: Partial<OrganisationPayload> = {}): OrganisationPayload {
	return {
		role: ORGANISATION_ROLES_ID.APPLICANT,
		organisationId: 'DDDDDDDD-1234-1234-1234-DDDDDDDDDDDD',
		Organisation: {
			name: 'Ministry of Example',
			Address: buildAddress('EEEEEEEE-1234-1234-1234-EEEEEEEEEEEE'),
			OrganisationToContact: [
				{
					Contact: {
						id: 'FFFFFFFF-1234-1234-1234-FFFFFFFFFFFF',
						contactPreferenceId: CONTACT_PREFERENCE_ID.EMAIL,
						orgName: 'Example Org',
						jobTitleOrRole: 'Planning Lead'
					}
				}
			]
		},
		...overrides
	};
}

function buildEvent(overrides: Partial<EventPayload> = {}): EventPayload {
	return {
		id: '99999999-1234-1234-1234-999999999999',
		date: BASE_DATE,
		prepDuration: new Prisma.Decimal('0.5'),
		sittingDuration: new Prisma.Decimal('1.25'),
		reportingDuration: new Prisma.Decimal('2'),
		venue: 'Town Hall',
		notificationDate: BASE_DATE,
		issuesReportPublishedDate: BASE_DATE,
		statementsDate: BASE_DATE,
		caseManagementConferenceDate: BASE_DATE,
		preMeetingDate: BASE_DATE,
		proofsOfEvidenceDate: BASE_DATE,
		...overrides
	};
}

function buildApplication(overrides: Partial<Payload> = {}): Payload {
	return {
		id: 'AAAAAAAA-1234-1234-1234-AAAAAAAAAAAA',
		reference: 'CROWN/2026/0000001',
		createdDate: BASE_DATE,
		updatedDate: BASE_DATE,
		updatedById: null,
		typeId: APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT,
		subTypeId: APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT,
		linkedParentId: 'BBBBBBBB-1234-1234-1234-BBBBBBBBBBBB',
		description: 'A new building',
		lpaId: '11111111-1234-1234-1234-111111111111',
		Lpa: { pinsCode: 'Q1111' },
		hasSecondaryLpa: true,
		secondaryLpaId: '22222222-1234-1234-1234-222222222222',
		SecondaryLpa: { pinsCode: 'Q2222' },
		hasAgent: true,
		Organisations: [buildOrganisation()],
		siteAddressId: 'CCCCCCCC-1234-1234-1234-CCCCCCCCCCCC',
		SiteAddress: buildAddress(),
		siteEasting: 123456,
		siteNorthing: 654321,
		siteArea: new Prisma.Decimal('12.75'),
		expectedDateOfSubmission: BASE_DATE,
		statusId: APPLICATION_STATUS_ID.NEW,
		stageId: APPLICATION_STAGE_ID.CONSULTATION,
		nationallyImportant: true,
		nationallyImportantConfirmationDate: BASE_DATE,
		notNationallyImportantEmailSent: false,
		containsDistressingContent: false,
		lpaReference: 'LPA/123',
		categoryId: 'major',
		isGreenBelt: true,
		// TODO: Prisma stores a string but the schema expects a boolean - see TODO in mapper
		healthAndSafetyIssue: null,
		applicationReceivedDate: BASE_DATE,
		applicationReceivedDateEmailSent: true,
		applicationAcceptedDate: BASE_DATE,
		lpaQuestionnaireSentDate: BASE_DATE,
		lpaQuestionnaireSpecialEmailSent: false,
		lpaQuestionnaireReceivedDate: BASE_DATE,
		lpaQuestionnaireReceivedEmailSent: true,
		publishDate: BASE_DATE,
		pressNoticeDate: BASE_DATE,
		neighboursNotifiedByLpaDate: BASE_DATE,
		siteNoticeByLpaDate: BASE_DATE,
		targetDecisionDate: BASE_DATE,
		extendedTargetDecisionDate: BASE_DATE,
		recoveredDate: BASE_DATE,
		recoveredReportSentDate: BASE_DATE,
		withdrawnDate: BASE_DATE,
		decisionDate: BASE_DATE,
		originalDecisionDate: BASE_DATE,
		decisionOutcomeId: 'approved',
		turnedAwayDate: BASE_DATE,
		representationsPublishDate: BASE_DATE,
		representationsPeriodStartDate: BASE_DATE,
		representationsPeriodEndDate: BASE_DATE,
		inspector1Id: 'inspector-1',
		inspector2Id: 'inspector-2',
		inspector3Id: 'inspector-3',
		assessorInspectorId: 'assessor-1',
		caseOfficerId: 'case-officer-1',
		planningOfficerId: 'planning-officer-1',
		eiaScreening: true,
		eiaScreeningOutcome: true,
		environmentalStatementReceivedDate: BASE_DATE,
		siteIsVisibleFromPublicLand: true,
		procedureId: APPLICATION_PROCEDURE_ID.HEARING,
		procedureNotificationDate: BASE_DATE,
		eventId: '99999999-1234-1234-1234-999999999999',
		Event: buildEvent(),
		hasApplicationFee: true,
		applicationFee: new Prisma.Decimal('1234.56'),
		applicationFeeReceivedDate: BASE_DATE,
		eligibleForFeeRefund: true,
		applicationFeeRefundAmount: new Prisma.Decimal('100.5'),
		applicationFeeRefundDate: BASE_DATE,
		siteVisitDate: BASE_DATE,
		cilLiable: true,
		cilAmount: new Prisma.Decimal('999.99'),
		bngExempt: false,
		hasCostsApplications: true,
		costsApplicationsComment: 'Some costs',
		environmentalImpactAssessment: true,
		developmentPlan: true,
		rightOfWay: false,
		...overrides
	};
}

function buildMinimalApplication(): Payload {
	return buildApplication({
		updatedDate: null,
		subTypeId: null,
		linkedParentId: null,
		hasSecondaryLpa: false,
		secondaryLpaId: null,
		SecondaryLpa: null,
		Organisations: [],
		siteAddressId: null,
		SiteAddress: null,
		siteEasting: null,
		siteNorthing: null,
		siteArea: null,
		statusId: null,
		stageId: null,
		nationallyImportant: null,
		nationallyImportantConfirmationDate: null,
		lpaReference: null,
		categoryId: null,
		isGreenBelt: null,
		applicationReceivedDate: null,
		applicationAcceptedDate: null,
		lpaQuestionnaireSentDate: null,
		lpaQuestionnaireReceivedDate: null,
		publishDate: null,
		pressNoticeDate: null,
		neighboursNotifiedByLpaDate: null,
		siteNoticeByLpaDate: null,
		targetDecisionDate: null,
		extendedTargetDecisionDate: null,
		recoveredDate: null,
		recoveredReportSentDate: null,
		withdrawnDate: null,
		decisionDate: null,
		originalDecisionDate: null,
		decisionOutcomeId: null,
		turnedAwayDate: null,
		representationsPublishDate: null,
		representationsPeriodStartDate: null,
		representationsPeriodEndDate: null,
		inspector1Id: null,
		inspector2Id: null,
		inspector3Id: null,
		assessorInspectorId: null,
		caseOfficerId: null,
		planningOfficerId: null,
		eiaScreening: null,
		eiaScreeningOutcome: null,
		environmentalStatementReceivedDate: null,
		siteIsVisibleFromPublicLand: null,
		procedureId: null,
		procedureNotificationDate: null,
		eventId: null,
		Event: null,
		hasApplicationFee: null,
		applicationFee: null,
		applicationFeeReceivedDate: null,
		eligibleForFeeRefund: null,
		applicationFeeRefundAmount: null,
		applicationFeeRefundDate: null,
		siteVisitDate: null,
		cilLiable: null,
		cilAmount: null,
		bngExempt: null,
		hasCostsApplications: null,
		costsApplicationsComment: null,
		environmentalImpactAssessment: null,
		developmentPlan: null,
		rightOfWay: null
	});
}

const map = (overrides: Partial<Payload> = {}) => mapCrownDevelopmentToOdwSchema(buildApplication(overrides));

describe('crown-development.mapper', () => {
	describe('mapCrownDevelopmentToOdwSchema', () => {
		it('should map core case fields', () => {
			const result = map();

			assert.strictEqual(result.id, 'AAAAAAAA-1234-1234-1234-AAAAAAAAAAAA');
			assert.strictEqual(result.reference, 'CROWN/2026/0000001');
			assert.strictEqual(result.createdDate, BASE_DATE.toISOString());
			assert.strictEqual(result.expectedDateOfSubmission, BASE_DATE.toISOString());
			assert.strictEqual(result.caseType, CASE_TYPE.crown);
			assert.strictEqual(result.hasAgent, true);
			assert.strictEqual(result.linkedParentId, 'BBBBBBBB-1234-1234-1234-BBBBBBBBBBBB');
			assert.strictEqual(result.description, 'A new building');
			assert.strictEqual(result.primaryLPACode, 'Q1111');
			assert.strictEqual(result.secondaryLPACode, 'Q2222');
			assert.strictEqual(result.lpaReference, 'LPA/123');
		});

		it('should pass through boolean and string fields unchanged', () => {
			const result = map();
			const passthrough = [
				'nationallyImportant',
				'notNationallyImportantEmailSent',
				'containsDistressingContent',
				'isGreenBelt',
				'applicationReceivedDateEmailSent',
				'lpaQuestionnaireReceivedEmailSent',
				'inspector1Id',
				'inspector2Id',
				'inspector3Id',
				'assessorInspectorId',
				'caseOfficerId',
				'planningOfficerId',
				'eiaScreening',
				'environmentalImpactAssessment',
				'siteIsVisibleFromPublicLand',
				'hasApplicationFee',
				'eligibleForFeeRefund',
				'cilLiable',
				'bngExempt',
				'hasCostsApplications',
				'costsApplicationsComment',
				'developmentPlan',
				'rightOfWay'
			] as const;
			const source = buildApplication();
			for (const field of passthrough) {
				assert.strictEqual(result[field], source[field], field);
			}
		});

		describe('dates', () => {
			const dateFields = [
				'updatedDate',
				'nationallyImportantConfirmationDate',
				'applicationReceivedDate',
				'applicationAcceptedDate',
				'lpaQuestionnaireSentDate',
				'lpaQuestionnaireReceivedDate',
				'publishDate',
				'pressNoticeDate',
				'neighboursNotifiedByLpaDate',
				'siteNoticeByLpaDate',
				'targetDecisionDate',
				'extendedTargetDecisionDate',
				'recoveredDate',
				'recoveredReportSentDate',
				'withdrawnDate',
				'decisionDate',
				'originalDecisionDate',
				'turnedAwayDate',
				'representationsPublishDate',
				'representationsPeriodStartDate',
				'representationsPeriodEndDate',
				'environmentalStatementReceivedDate',
				'procedureNotificationDate',
				'applicationFeeReceivedDate',
				'applicationFeeRefundDate',
				'siteVisitDate'
			] as const;

			for (const field of dateFields) {
				it(`should map ${field} from its own source field to an ISO string`, () => {
					const result = map({ [field]: TEST_DATE });
					assert.strictEqual(result[field], TEST_DATE.toISOString());
				});

				it(`should map a null ${field} to null`, () => {
					const result = map({ [field]: null });
					assert.strictEqual(result[field], null);
				});
			}
		});

		describe('decimals', () => {
			const decimalFields = ['siteArea', 'applicationFee', 'applicationFeeRefundAmount', 'cilAmount'] as const;

			for (const field of decimalFields) {
				it(`should map ${field} to a number keeping decimal places`, () => {
					const result = map({ [field]: new Prisma.Decimal('0.25') });
					assert.strictEqual(result[field], 0.25);
					assert.strictEqual(typeof result[field], 'number');
				});

				it(`should map a null ${field} to null`, () => {
					const result = map({ [field]: null });
					assert.strictEqual(result[field], null);
				});
			}
		});

		describe('site', () => {
			it('should map the site address to a single-item array', () => {
				const result = map();
				assert.deepStrictEqual(result.siteAddress, [
					{
						addressId: 'CCCCCCCC-1234-1234-1234-CCCCCCCCCCCC',
						line1: '1 High Street',
						line2: 'Flat 2',
						townCity: 'Bristol',
						county: 'Avon',
						postcode: 'BS1 6PN'
					}
				]);
			});

			it('should map a missing site address to null', () => {
				assert.strictEqual(map({ SiteAddress: null }).siteAddress, null);
			});

			it('should pad coordinates to 6 digits', () => {
				const result = map({ siteEasting: 1234, siteNorthing: 98765 });
				assert.strictEqual(result.siteEasting, '001234');
				assert.strictEqual(result.siteNorthing, '098765');
			});

			it('should map null coordinates to null', () => {
				const result = map({ siteEasting: null, siteNorthing: null });
				assert.strictEqual(result.siteEasting, null);
				assert.strictEqual(result.siteNorthing, null);
			});

			it('should map a 0 coordinate to "000000" rather than null', () => {
				const result = map({ siteEasting: 0, siteNorthing: 0 });
				assert.strictEqual(result.siteEasting, '000000');
				assert.strictEqual(result.siteNorthing, '000000');
			});
		});

		describe('LPAs', () => {
			it('should map a missing primary pinsCode to undefined', () => {
				assert.strictEqual(map({ Lpa: { pinsCode: null } }).primaryLPACode, undefined);
			});

			it('should map a missing secondary LPA to null', () => {
				assert.strictEqual(map({ SecondaryLpa: null }).secondaryLPACode, null);
			});
		});

		describe('lookups', () => {
			const lookups = [
				{ field: 'typeId', output: 'type', values: APPLICATION_TYPES, nullable: false },
				{ field: 'subTypeId', output: 'subType', values: APPLICATION_SUB_TYPES, nullable: true },
				{ field: 'statusId', output: 'applicationStatus', values: APPLICATION_STATUS, nullable: false },
				{ field: 'stageId', output: 'applicationStage', values: APPLICATION_STAGE, nullable: true },
				{ field: 'categoryId', output: 'category', values: CATEGORIES, nullable: true },
				{ field: 'decisionOutcomeId', output: 'decisionOutcome', values: APPLICATION_DECISION_OUTCOME, nullable: true }
			] as const;

			for (const { field, output, values, nullable } of lookups) {
				describe(field, () => {
					for (const { id, displayName } of values) {
						it(`should map "${id}" to "${displayName}"`, () => {
							assert.strictEqual(map({ [field]: id })[output], displayName);
						});
					}

					it('should throw for an unknown id', () => {
						assert.throws(() => map({ [field]: 'bogus' }), { message: `Unknown ${field}: bogus` });
					});

					if (nullable) {
						it('should map null to null', () => {
							assert.strictEqual(map({ [field]: null })[output], null);
						});
					}
				});
			}

			it('should map a null statusId to undefined', () => {
				assert.strictEqual(map({ statusId: null }).applicationStatus, undefined);
			});

			describe('procedureId', () => {
				const procedures = [
					{ id: APPLICATION_PROCEDURE_ID.WRITTEN_REPS, expected: 'Written Representations' },
					{ id: APPLICATION_PROCEDURE_ID.HEARING, expected: 'Hearing' },
					{ id: APPLICATION_PROCEDURE_ID.INQUIRY, expected: 'Inquiry' }
				];
				for (const { id, expected } of procedures) {
					it(`should map "${id}" to "${expected}"`, () => {
						assert.strictEqual(map({ procedureId: id }).procedure, expected);
					});
				}

				it('should throw for an unknown id', () => {
					assert.throws(() => map({ procedureId: 'bogus' }), { message: 'Unknown procedureId: bogus' });
				});

				it('should map null to null', () => {
					assert.strictEqual(map({ procedureId: null }).procedure, null);
				});
			});

			describe('eiaScreeningOutcome', () => {
				const outcomes = [
					{ input: true, expected: 'required' },
					{ input: false, expected: 'not required' },
					{ input: null, expected: null }
				];
				for (const { input, expected } of outcomes) {
					it(`should map ${input} to ${expected}`, () => {
						assert.strictEqual(map({ eiaScreeningOutcome: input }).eiaScreeningOutcome, expected);
					});
				}
			});
		});

		describe('organisations', () => {
			it('should map organisations with address and contacts', () => {
				assert.deepStrictEqual(map().organisations, [
					{
						contactRoleType: 'applicant',
						organisationId: 'DDDDDDDD-1234-1234-1234-DDDDDDDDDDDD',
						organisationName: 'Ministry of Example',
						organisationAddress: [
							{
								addressId: 'EEEEEEEE-1234-1234-1234-EEEEEEEEEEEE',
								line1: '1 High Street',
								line2: 'Flat 2',
								townCity: 'Bristol',
								county: 'Avon',
								postcode: 'BS1 6PN'
							}
						],
						contacts: [
							{
								contactId: 'FFFFFFFF-1234-1234-1234-FFFFFFFFFFFF',
								contactPreference: 'email',
								writtenRepOrgName: 'Example Org',
								writtenRepJobTitleorRole: 'Planning Lead'
							}
						]
					}
				]);
			});

			it('should map an empty organisations list to an empty array', () => {
				assert.deepStrictEqual(map({ Organisations: [] }).organisations, []);
			});

			it('should map agent and applicant roles', () => {
				const result = map({
					Organisations: [
						buildOrganisation({ role: ORGANISATION_ROLES_ID.APPLICANT }),
						buildOrganisation({ role: ORGANISATION_ROLES_ID.AGENT })
					]
				});
				assert.deepStrictEqual(
					result.organisations?.map((o) => o.contactRoleType),
					['applicant', 'agent']
				);
			});

			it('should throw for an unknown role', () => {
				assert.throws(() => map({ Organisations: [buildOrganisation({ role: 'owner' })] }), {
					message: 'Unknown organisation roleId: owner'
				});
			});

			it('should map a missing organisation address to null', () => {
				const org = buildOrganisation();
				org.Organisation.Address = null;
				assert.strictEqual(map({ Organisations: [org] }).organisations?.[0].organisationAddress, null);
			});

			const preferences = [
				{ input: CONTACT_PREFERENCE_ID.EMAIL, expected: 'email' },
				{ input: CONTACT_PREFERENCE_ID.POST, expected: 'post' },
				{ input: null, expected: null },
				{ input: 'carrier-pigeon', expected: null }
			];
			for (const { input, expected } of preferences) {
				it(`should map contact preference ${input} to ${expected}`, () => {
					const org = buildOrganisation();
					org.Organisation.OrganisationToContact[0].Contact.contactPreferenceId = input;
					const contact = map({ Organisations: [org] }).organisations?.[0].contacts?.[0];
					assert.strictEqual(contact?.contactPreference, expected);
				});
			}

			it('should map null written-rep fields to null', () => {
				const org = buildOrganisation();
				org.Organisation.OrganisationToContact[0].Contact.orgName = null;
				org.Organisation.OrganisationToContact[0].Contact.jobTitleOrRole = null;
				const contact = map({ Organisations: [org] }).organisations?.[0].contacts?.[0];
				assert.strictEqual(contact?.writtenRepOrgName, null);
				assert.strictEqual(contact?.writtenRepJobTitleorRole, null);
			});
		});

		describe('event', () => {
			it('should map event fields', () => {
				const result = map();
				assert.strictEqual(result.eventDate, BASE_DATE.toISOString());
				assert.strictEqual(result.eventPrepDuration, 0.5);
				assert.strictEqual(result.eventSittingDuration, 1.25);
				assert.strictEqual(result.eventReportingDuration, 2);
				assert.strictEqual(result.eventVenue, 'Town Hall');
				assert.strictEqual(result.eventNotificationDate, BASE_DATE.toISOString());
				assert.strictEqual(result.eventIssuesReportPublishedDate, BASE_DATE.toISOString());
				assert.strictEqual(result.eventStatementsDate, BASE_DATE.toISOString());
				assert.strictEqual(result.eventCaseManagementConferenceDate, BASE_DATE.toISOString());
				assert.strictEqual(result.eventPreMeetingDate, BASE_DATE.toISOString());
				assert.strictEqual(result.eventProofsOfEvidenceDate, BASE_DATE.toISOString());
			});

			it('should map all event fields to null when there is no event', () => {
				const result = map({ Event: null });
				const eventFields = [
					'eventDate',
					'eventPrepDuration',
					'eventSittingDuration',
					'eventReportingDuration',
					'eventVenue',
					'eventNotificationDate',
					'eventIssuesReportPublishedDate',
					'eventStatementsDate',
					'eventCaseManagementConferenceDate',
					'eventPreMeetingDate',
					'eventProofsOfEvidenceDate'
				] as const;
				for (const field of eventFields) {
					assert.strictEqual(result[field], null, field);
				}
			});

			it('should map null event values to null', () => {
				const result = map({
					Event: buildEvent({ date: null, prepDuration: null, venue: null })
				});
				assert.strictEqual(result.eventDate, null);
				assert.strictEqual(result.eventPrepDuration, null);
				assert.strictEqual(result.eventVenue, null);
			});
		});

		describe('schema validation', () => {
			async function assertValid(payload: Payload) {
				const validate = (await getCachedAjv()).getSchema(SCHEMA_ID);
				assert.ok(validate, `${SCHEMA_ID} not registered`);
				const result = mapCrownDevelopmentToOdwSchema(payload);
				assert.strictEqual(validate(result), true, JSON.stringify(validate.errors, null, 2));
			}

			it('should produce a schema-valid message for a fully populated application', async () => {
				await assertValid(buildApplication());
			});

			it('should produce a schema-valid message for a minimal application', async () => {
				await assertValid(buildMinimalApplication());
			});

			for (const { id } of APPLICATION_STAGE) {
				const todo =
					id === APPLICATION_STAGE_ID.HEARING
						? 'ODW expects "Hearing/Inquiry date set" - see TODO in mapper'
						: undefined;
				it(`should produce a schema-valid stage for "${id}"`, { todo }, async () => {
					await assertValid(buildApplication({ stageId: id }));
				});
			}

			for (const id of Object.values(APPLICATION_PROCEDURE_ID)) {
				it(`should produce a schema-valid procedure for "${id}"`, async () => {
					await assertValid(buildApplication({ procedureId: id }));
				});
			}
		});
	});
});

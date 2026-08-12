import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	SITE_AREA_UNIT_ID,
	APPLICANT_TYPE_ID,
	PRE_APPLICATION_ADVICE_ID,
	OUTCOME_TYPE_ID,
	DECISION_OUTCOME_ID,
	SITE_VISIT_TYPE_ID,
	WASTE_TYPE_ID,
	WASTE_UNIT_ID,
	OCCUPANCY_TYPE_ID,
	UNIT_TYPE_ID,
	HOUSING_TYPE_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import { S62aCaseUpdateMapper, type UpdateCaseAnswers } from './s62a-update-case-mapper.ts';
import type { Address } from '@planning-inspectorate/dynamic-forms';
import { addBusinessDays } from 'date-fns';
import type { S62aCaseViewModel } from './view-model.ts';

describe('S62aCaseUpdateMapper', () => {
	describe('Empty and Undefined Payloads', () => {
		it('returns an empty object if no fields are provided', () => {
			const answers: UpdateCaseAnswers = {};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result, {});
		});

		it('ignores explicitly undefined fields', () => {
			const answers: UpdateCaseAnswers = {
				developmentDescription: undefined,
				s62aStatusId: undefined,
				siteNorthing: undefined
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result, {});
		});
	});

	describe('Scalar Mapping', () => {
		it('maps scalar fields when provided', () => {
			const date = new Date('2026-07-14T12:00:00Z');
			const repStartDate = new Date('2026-08-01T10:00:00Z');
			const repEndDate = new Date('2026-08-02T10:00:00Z');
			const publishDate = new Date('2026-08-01T10:00:00Z');

			const answers: UpdateCaseAnswers = {
				developmentDescription: 'Updated description',
				likelyIssues: 'Traffic',
				expectedSubmissionDate: date,
				hasSecondaryLpa: 'yes',
				representationsPeriod: {
					start: repStartDate,
					end: repEndDate
				},
				representationsPublishDate: publishDate
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.description, 'Updated description');
			assert.strictEqual(result.likelyIssues, 'Traffic');
			assert.strictEqual(result.expectedSubmissionDate, date);
			assert.strictEqual(result.hasSecondaryLpa, true);
			assert.strictEqual(result.representationsPeriodStartDate, repStartDate);
			assert.strictEqual(result.representationsPeriodEndDate, repEndDate);
			assert.strictEqual(result.representationsPublishDate, publishDate);
		});

		it('allows clearing fields like description and likelyIssues with empty strings', () => {
			const answers: UpdateCaseAnswers = {
				developmentDescription: '',
				likelyIssues: ''
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.description, '');
			assert.strictEqual(result.likelyIssues, null);
		});
	});

	describe('Location and Site Area Mapping', () => {
		it('maps site northing and easting, allowing 0 as a valid value', () => {
			const answers: UpdateCaseAnswers = {
				siteNorthing: 0,
				siteEasting: 12345
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.siteNorthing, 0);
			assert.strictEqual(result.siteEasting, 12345);
		});

		it('clears site northing and easting when falsy (but not 0) is passed', () => {
			const answers = {
				siteNorthing: '',
				siteEasting: null
			} as unknown as UpdateCaseAnswers;
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.siteNorthing, null);
			assert.strictEqual(result.siteEasting, null);
		});

		it('maps site area in square metres and connects the unit', () => {
			const answers: UpdateCaseAnswers = {
				siteAreaSquareMetres: 2500
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.siteAreaInSquareMetres, 2500);
			assert.deepStrictEqual(result.SiteAreaOriginalUnit, { connect: { id: SITE_AREA_UNIT_ID.METRES_SQUARED } });
		});

		it('maps site area in hectares, converting to square metres via Decimal, and connects the unit', () => {
			const answers: UpdateCaseAnswers = {
				siteAreaHectares: 2.5
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.siteAreaInSquareMetres, new Prisma.Decimal(2.5).times(10000));
			assert.deepStrictEqual(result.SiteAreaOriginalUnit, { connect: { id: SITE_AREA_UNIT_ID.HECTARES } });
		});

		it('disconnects the site area unit and nulls the value if area fields are explicitly cleared', () => {
			const answers = {
				siteAreaSquareMetres: '',
				siteAreaHectares: ''
			} as unknown as UpdateCaseAnswers;
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.siteAreaInSquareMetres, null);
			assert.deepStrictEqual(result.SiteAreaOriginalUnit, { disconnect: true });
		});
	});

	describe('Lookup Mapping', () => {
		it('maps required lookup fields into Prisma connect objects', () => {
			const answers: UpdateCaseAnswers = {
				s62aStatusId: 'status-123',
				typeId: 'type-456'
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aStatus, { connect: { id: 'status-123' } });
			assert.deepStrictEqual(result.Type, { connect: { id: 'type-456' } });
			assert.strictEqual(result.Lpa, undefined);
		});

		it('connects optional lookup fields when a value is provided', () => {
			const answers: UpdateCaseAnswers = {
				applicationPhaseId: 'phase-1'
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.ApplicationPhase, { connect: { id: 'phase-1' } });
		});

		it('disconnects optional lookup fields when an empty string or null is provided', () => {
			const answers: UpdateCaseAnswers = {
				applicationPhaseId: '',
				classificationId: null
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.ApplicationPhase, { disconnect: true });
			assert.deepStrictEqual(result.Classification, { disconnect: true });
		});
	});

	describe('Address Mapping', () => {
		it('maps siteAddress using the external view model formatter', () => {
			const answers: UpdateCaseAnswers = {
				siteAddress: { addressLine1: '10 Downing Street', postcode: 'SW1A 2AA' } as Address
			};
			const expectedAddressData = viewModelToAddressUpdateInput(answers.siteAddress as Address);
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.SiteAddress, {
				upsert: {
					create: expectedAddressData,
					update: expectedAddressData
				}
			});
		});
	});

	describe('Dates Mapping', () => {
		it('does not generate S62aDates update if no date answers are provided', () => {
			const mapper = new S62aCaseUpdateMapper({});
			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.S62aDates, undefined);
		});

		it('maps basic date fields correctly', () => {
			const date = new Date('2026-07-20T10:00:00Z');
			const answers: UpdateCaseAnswers = {
				notificationReceivedDate: date,
				publishDate: date
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { notificationReceivedDate: date, publishDate: date },
					update: { notificationReceivedDate: date, publishDate: date }
				}
			});
		});

		it('calculates targetPublishDate as 5 business days after applicationValidDate', () => {
			const validDate = new Date('2026-07-01T10:00:00Z');
			const expectedTargetDate = addBusinessDays(validDate, 5);

			const answers: UpdateCaseAnswers = {
				applicationValidDate: validDate
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { applicationValidDate: validDate, targetPublishDate: expectedTargetDate },
					update: { applicationValidDate: validDate, targetPublishDate: expectedTargetDate }
				}
			});
		});

		it('nullifies targetPublishDate if applicationValidDate is explicitly cleared', () => {
			const answers: UpdateCaseAnswers = {
				applicationValidDate: null
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { applicationValidDate: null, targetPublishDate: null },
					update: { applicationValidDate: null, targetPublishDate: null }
				}
			});
		});

		it('does not overwrite targetPublishDate if applicationValidDate is not in the payload', () => {
			const date = new Date('2026-07-20T10:00:00Z');
			const answers: UpdateCaseAnswers = {
				publishDate: date
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { publishDate: date },
					update: { publishDate: date }
				}
			});
			assert.strictEqual((result.S62aDates?.upsert.create as any).targetPublishDate, undefined);
		});

		it('maps reconsultationDetailsDate to individual start and end dates', () => {
			const startDate = new Date('2026-07-20T10:00:00Z');
			const endDate = new Date('2026-08-20T10:00:00Z');

			const answers: UpdateCaseAnswers = {
				reconsultationDetailsDate: { start: startDate, end: endDate }
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { reconsultationDetailsSentDate: startDate, reconsultationDetailsDeadlineDate: endDate },
					update: { reconsultationDetailsSentDate: startDate, reconsultationDetailsDeadlineDate: endDate }
				}
			});
		});

		it('maps partial reconsultationDetailsDate correctly', () => {
			const startDate = new Date('2026-07-20T10:00:00Z');

			const answers: UpdateCaseAnswers = {
				reconsultationDetailsDate: { start: startDate, end: null }
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { reconsultationDetailsSentDate: startDate, reconsultationDetailsDeadlineDate: null },
					update: { reconsultationDetailsSentDate: startDate, reconsultationDetailsDeadlineDate: null }
				}
			});
		});
	});

	describe('Fees Mapping', () => {
		it('does not generate S62aFees update if no fee answers are provided', () => {
			const mapper = new S62aCaseUpdateMapper({});
			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.S62aFees, undefined);
		});

		it('maps fee boolean fields to true boolean values', () => {
			const answers: UpdateCaseAnswers = {
				hasPreApplicationFee: 'yes',
				hasApplicationFee: true,
				eligibleForFeeRefund: 'no'
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aFees, {
				upsert: {
					create: {
						hasPreApplicationFee: true,
						hasApplicationFee: true,
						eligibleForFeeRefund: false
					},
					update: {
						hasPreApplicationFee: true,
						hasApplicationFee: true,
						eligibleForFeeRefund: false
					}
				}
			});
		});

		it('maps fee string/number fields correctly, allowing zero but converting empty strings to null', () => {
			const answers: UpdateCaseAnswers = {
				preApplicationFee: '1500.50',
				applicationFee: 0,
				applicationFeeRefundAmount: ''
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aFees, {
				upsert: {
					create: {
						preApplicationFee: 1500.5,
						applicationFee: 0,
						applicationFeeRefundAmount: null
					},
					update: {
						preApplicationFee: 1500.5,
						applicationFee: 0,
						applicationFeeRefundAmount: null
					}
				}
			});
		});

		it('maps fee date fields correctly', () => {
			const date = new Date('2026-08-01T10:00:00Z');
			const answers: UpdateCaseAnswers = {
				invoiceDate: date,
				applicationFeeReceivedDate: date
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aFees, {
				upsert: {
					create: {
						invoiceDate: date,
						applicationFeeReceivedDate: date
					},
					update: {
						invoiceDate: date,
						applicationFeeReceivedDate: date
					}
				}
			});
		});
	});

	describe('Details Tab — Lookups', () => {
		it('connects stage, category and procedure when ids are provided', () => {
			const answers: UpdateCaseAnswers = {
				stageId: 'stage-1',
				categoryId: 'major-minerals',
				procedureId: 'hearing'
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.Stage, { connect: { id: 'stage-1' } });
			assert.deepStrictEqual(result.Category, { connect: { id: 'major-minerals' } });
			assert.deepStrictEqual(result.Procedure, { connect: { id: 'hearing' } });
		});

		it('disconnects stage, category and procedure when cleared', () => {
			const answers: UpdateCaseAnswers = {
				stageId: null,
				categoryId: '',
				procedureId: null
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.Stage, { disconnect: true });
			assert.deepStrictEqual(result.Category, { disconnect: true });
			assert.deepStrictEqual(result.Procedure, { disconnect: true });
		});
	});

	describe('Details Tab — String scalars', () => {
		it('maps reference and health & safety strings when provided', () => {
			const answers: UpdateCaseAnswers = {
				lpaReference: 'LPA/123',
				listedBuildingReference: 'LBC/456',
				healthAndSafetyIssue: 'Asbestos present'
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.lpaReference, 'LPA/123');
			assert.strictEqual(result.listedBuildingReference, 'LBC/456');
			assert.strictEqual(result.healthAndSafetyIssue, 'Asbestos present');
		});

		it('clears reference and health & safety strings to null when empty', () => {
			const answers: UpdateCaseAnswers = {
				lpaReference: '',
				listedBuildingReference: '',
				healthAndSafetyIssue: ''
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.lpaReference, null);
			assert.strictEqual(result.listedBuildingReference, null);
			assert.strictEqual(result.healthAndSafetyIssue, null);
		});
	});

	describe('Details Tab — Booleans', () => {
		it('maps "No" (boolean false) to false, not null', () => {
			const answers = {
				isGreenBelt: false,
				cilLiable: false,
				bngExempt: false
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.isGreenBelt, false);
			assert.strictEqual(result.cilLiable, false);
			assert.strictEqual(result.bngExempt, false);
		});

		it('maps "Yes" (boolean true) to true', () => {
			const answers = {
				isGreenBelt: true,
				cilLiable: true,
				bngExempt: true
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.isGreenBelt, true);
			assert.strictEqual(result.cilLiable, true);
			assert.strictEqual(result.bngExempt, true);
		});

		it('clears booleans to null when the value is null (remove and save)', () => {
			const answers = {
				isGreenBelt: null,
				cilLiable: null,
				bngExempt: null
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.isGreenBelt, null);
			assert.strictEqual(result.cilLiable, null);
			assert.strictEqual(result.bngExempt, null);
		});
	});

	describe('Details Tab — CIL amount', () => {
		it('maps a CIL amount to a Decimal', () => {
			const answers: UpdateCaseAnswers = { cilAmount: 1500.5 };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.cilAmount, new Prisma.Decimal(1500.5));
		});

		it('maps a CIL amount of 0 rather than treating it as cleared', () => {
			const answers: UpdateCaseAnswers = { cilAmount: 0 };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.cilAmount, new Prisma.Decimal(0));
		});

		it('clears the CIL amount to null when empty/removed', () => {
			const answers = { cilAmount: null } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.cilAmount, null);
		});
	});
	describe('LPA Contact Mapping', () => {
		it('generates upserts for LPA and Secondary LPA contacts when provided', () => {
			const answers: UpdateCaseAnswers = {
				lpaFirstName: 'John',
				lpaLastName: 'Doe',
				secondaryLpaEmailAddress: 'jane@council.gov.uk'
			};
			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.LpaContact, {
				upsert: {
					create: { firstName: 'John', lastName: 'Doe', email: null, telephoneNumber: null },
					update: { firstName: 'John', lastName: 'Doe', email: null, telephoneNumber: null }
				}
			});

			assert.deepStrictEqual(result.SecondaryLpaContact, {
				upsert: {
					create: { firstName: null, lastName: null, email: 'jane@council.gov.uk', telephoneNumber: null },
					update: { firstName: null, lastName: null, email: 'jane@council.gov.uk', telephoneNumber: null }
				}
			});
		});
	});

	describe('Parties (Agents and Applicants) Mapping', () => {
		it('creates a new agent if no relation exists in existingCase', () => {
			const answers: UpdateCaseAnswers = {
				agentName: 'New Agent Corp',
				agentAddress: { addressLine1: '1 Agent Lane' } as Address
			};
			const mapper = new S62aCaseUpdateMapper(answers, {} as S62aCaseViewModel);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aToApplicants?.create, [
				{
					Role: { connect: { id: ORGANISATION_ROLES_ID.AGENT } },
					Organisation: {
						create: {
							name: 'New Agent Corp',
							Address: {
								create: {
									line1: '1 Agent Lane',
									line2: undefined,
									townCity: undefined,
									county: undefined,
									postcode: undefined
								}
							}
						}
					}
				}
			]);
		});

		it('updates an existing agent using the relation ID from existingCase', () => {
			const answers: UpdateCaseAnswers = { agentName: 'Updated Agent Corp' };
			const existingCase = {
				agentRelationId: 'agent-rel-1',
				agentOrganisationAddressId: 'addr-1'
			} as S62aCaseViewModel;

			const mapper = new S62aCaseUpdateMapper(answers, existingCase);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aToApplicants?.update, [
				{
					where: { id: 'agent-rel-1' },
					data: {
						Organisation: {
							update: {
								name: 'Updated Agent Corp',
								Address: undefined
							}
						}
					}
				}
			]);
		});

		it('disconnects the agent address if it is explicitly provided as null (cleared by user)', () => {
			const answers = { agentAddress: null };
			const existingCase = {
				agentRelationId: 'agent-rel-1',
				agentOrganisationAddressId: 'addr-1'
			} as unknown as S62aCaseViewModel;

			const mapper = new S62aCaseUpdateMapper(answers as unknown as UpdateCaseAnswers, existingCase);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aToApplicants?.update, [
				{
					where: { id: 'agent-rel-1' },
					data: {
						Organisation: {
							update: {
								name: undefined,
								Address: { disconnect: true }
							}
						}
					}
				}
			]);
		});

		it('creates new applicant organisations and updates existing ones', () => {
			const answers: UpdateCaseAnswers = {
				manageApplicantOrganisations: [
					{ id: 'org-new', organisationName: 'New Org' },
					{ id: 'org-1', organisationRelationId: 'rel-org-1', organisationName: 'Updated Org' }
				]
			};
			const mapper = new S62aCaseUpdateMapper(answers, {} as S62aCaseViewModel);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aToApplicants?.create, [
				{
					Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
					Organisation: {
						create: {
							name: 'New Org',
							Address: undefined
						}
					}
				}
			]);

			assert.deepStrictEqual(result.S62aToApplicants?.update, [
				{
					where: { id: 'rel-org-1' },
					data: {
						Organisation: {
							update: {
								name: 'Updated Org',
								Address: undefined
							}
						}
					}
				}
			]);
		});

		it('handles applicant contacts moving between organisations', () => {
			const existingCase = {
				applicantType: APPLICANT_TYPE_ID.ORGANISATION,
				manageApplicantOrganisations: [
					{ id: 'org-A', organisationRelationId: 'rel-org-A' },
					{ id: 'org-B', organisationRelationId: 'rel-org-B' }
				],
				manageApplicantContactDetails: [
					{ id: 'contact-1', organisationToContactRelationId: 'otc-1', applicantContactOrganisation: 'org-A' }
				]
			} as unknown as S62aCaseViewModel;

			// Contact 1 moves from org-A to org-B
			const answers: UpdateCaseAnswers = {
				manageApplicantContactDetails: [
					{
						id: 'contact-1',
						organisationToContactRelationId: 'otc-1',
						applicantContactOrganisation: 'org-B',
						applicantFirstName: 'Moved'
					}
				]
			};

			const mapper = new S62aCaseUpdateMapper(answers, existingCase);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aToApplicants?.update, [
				{
					where: { id: 'rel-org-A' },
					data: { Organisation: { update: { OrganisationToContact: { deleteMany: [{ id: 'otc-1' }] } } } }
				},
				{
					where: { id: 'rel-org-B' },
					data: {
						Organisation: {
							update: { OrganisationToContact: { create: [{ Contact: { connect: { id: 'contact-1' } } }] } }
						}
					}
				}
			]);
		});

		it('updates applicant contacts directly connected to the case (Individual Applicant)', () => {
			const answers: UpdateCaseAnswers = {
				applicantType: 'individual',
				manageApplicantContactDetails: [
					{ applicantRelationId: 'rel-ind-1', applicantFirstName: 'Bob' },
					{ applicantFirstName: 'New Bob' }
				]
			};
			const existingCase = { applicantType: APPLICANT_TYPE_ID.INDIVIDUAL } as S62aCaseViewModel;

			const mapper = new S62aCaseUpdateMapper(answers, existingCase);
			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aToApplicants?.update, [
				{
					where: { id: 'rel-ind-1' },
					data: {
						Contact: { update: { firstName: 'Bob', lastName: null, email: null, telephoneNumber: null } }
					}
				}
			]);

			assert.deepStrictEqual(result.S62aToApplicants?.create, [
				{
					Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
					Contact: { create: { firstName: 'New Bob', lastName: null, email: null, telephoneNumber: null } }
				}
			]);
		});
	});

	describe('Additional Contacts Mapping', () => {
		it('creates new additional contacts, defaulting to interested-party and mapping orgName properly', () => {
			const answers: UpdateCaseAnswers = {
				manageAdditionalContacts: [
					{
						firstName: 'Jane',
						lastName: 'Smith',
						organisationName: 'Community Org',
						additionalContactType: 'interested-party'
					},
					{
						firstName: 'Bob',
						additionalContactType: 'other',
						additionalContactType_otherContactType: 'Local MP'
					}
				]
			};

			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			const createOps = result.S62aToApplicants?.create as Prisma.S62aToApplicantCreateWithoutS62AInput[];
			assert.strictEqual(createOps.length, 2);

			assert.deepStrictEqual(createOps[0].Role?.connectOrCreate, {
				where: { id: 'interested-party' },
				create: { id: 'interested-party', displayName: 'Interested party' }
			});
			assert.deepStrictEqual(createOps[0].Contact?.create, {
				firstName: 'Jane',
				lastName: 'Smith',
				orgName: 'Community Org',
				email: null,
				telephoneNumber: null
			});

			assert.deepStrictEqual(createOps[1].Role?.connectOrCreate, {
				where: { id: 'local-mp' },
				create: { id: 'local-mp', displayName: 'Local MP' }
			});
			assert.deepStrictEqual(createOps[1].Contact?.create, {
				firstName: 'Bob',
				lastName: null,
				orgName: null,
				email: null,
				telephoneNumber: null
			});
		});

		it('updates existing additional contacts via their relation ID', () => {
			const answers: UpdateCaseAnswers = {
				manageAdditionalContacts: [
					{
						additionalContactRelationId: 'rel-add-1',
						firstName: 'Updated John',
						additionalContactType: 'statutory_consultee'
					}
				]
			};

			const mapper = new S62aCaseUpdateMapper(answers);
			const result = mapper.generateUpdateInput();

			const updateOps = result.S62aToApplicants
				?.update as Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[];
			assert.strictEqual(updateOps.length, 1);

			assert.strictEqual(updateOps[0].where.id, 'rel-add-1');
			assert.deepStrictEqual(updateOps[0].data.Role?.connectOrCreate, {
				where: { id: 'statutory_consultee' },
				create: { id: 'statutory_consultee', displayName: 'Interested party' }
			});
			assert.strictEqual((updateOps[0].data.Contact?.update as any).firstName, 'Updated John');
		});
	});

	describe('EIA Tab', () => {
		it('maps EIA booleans to true/false', () => {
			const answers = {
				eiaScreening: true,
				eiaScreeningOutcome: false
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.eiaScreening, true);
			assert.strictEqual(result.eiaScreeningOutcome, false);
		});

		it('clears EIA booleans to null when the value is null (remove and save)', () => {
			const answers = {
				eiaScreening: null,
				eiaScreeningOutcome: null
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.eiaScreening, null);
			assert.strictEqual(result.eiaScreeningOutcome, null);
		});

		it('does not emit EIA fields when they are not in the payload', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.eiaScreening, undefined);
			assert.strictEqual(result.eiaScreeningOutcome, undefined);
		});

		it('does not generate an S62aDates update for EIA booleans alone', () => {
			const answers = { eiaScreening: true } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.S62aDates, undefined);
		});

		it('maps environmentalStatementReceivedDate into the S62aDates upsert', () => {
			const esDate = new Date('2026-09-01T09:00:00Z');
			const answers: UpdateCaseAnswers = { environmentalStatementReceivedDate: esDate };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { environmentalStatementReceivedDate: esDate },
					update: { environmentalStatementReceivedDate: esDate }
				}
			});
		});

		it('nullifies environmentalStatementReceivedDate when cleared', () => {
			const answers: UpdateCaseAnswers = { environmentalStatementReceivedDate: null };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { environmentalStatementReceivedDate: null },
					update: { environmentalStatementReceivedDate: null }
				}
			});
		});
	});

	describe('Press Notice Tab', () => {
		it('maps valid press notice fields (number, string, null) to the update input', () => {
			const answers = {
				pressNoticeCost: 1500,
				pressNoticePlaced: 'Newspaper',
				pressNoticeReference: 'PN-12345'
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.ok(result.pressNoticeCost instanceof Prisma.Decimal);
			assert.strictEqual(result.pressNoticeCost?.toNumber(), 1500);
			assert.strictEqual(result.pressNoticePlaced, 'Newspaper');
			assert.strictEqual(result.pressNoticeReference, 'PN-12345');
		});

		it('maps pressNoticeCost correctly when supplied as a string', () => {
			const answers = {
				pressNoticeCost: '500.50'
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.ok(result.pressNoticeCost instanceof Prisma.Decimal);
			assert.strictEqual(result.pressNoticeCost.toNumber(), 500.5);
		});

		it('clears press notice fields to null when values are cleared or invalid', () => {
			const answers = {
				pressNoticeCost: null,
				pressNoticePlaced: null,
				pressNoticeReference: null
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.pressNoticeCost, null);
			assert.strictEqual(result.pressNoticePlaced, null);
			assert.strictEqual(result.pressNoticeReference, null);
		});

		it('normalises unexpected press notice values to null without throwing', () => {
			const answers = {
				pressNoticeCost: true,
				pressNoticePlaced: 24601,
				pressNoticeReference: { invalid: 'object' }
			} as unknown as UpdateCaseAnswers;

			let result: ReturnType<S62aCaseUpdateMapper['generateUpdateInput']> | undefined;

			assert.doesNotThrow(() => {
				result = new S62aCaseUpdateMapper(answers).generateUpdateInput();
			});

			assert.strictEqual(result?.pressNoticeCost, null);
			assert.strictEqual(result?.pressNoticePlaced, null);
			assert.strictEqual(result?.pressNoticeReference, null);
		});

		it('does not emit press notice fields when they are not in the payload', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.pressNoticeCost, undefined);
			assert.strictEqual(result.pressNoticePlaced, undefined);
			assert.strictEqual(result.pressNoticeReference, undefined);
		});
	});

	describe('Case Team Tab', () => {
		const allocated = new Date('2026-07-01T09:00:00Z');

		it('connects or creates a User for each role from the Entra ID', () => {
			const answers: UpdateCaseAnswers = {
				caseOfficerId: 'entra-officer',
				assessorInspectorId: 'entra-assessor',
				planningOfficerId: 'entra-planning',
				readerId: 'entra-reader'
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.CaseOfficer, {
				connectOrCreate: { where: { idpUserId: 'entra-officer' }, create: { idpUserId: 'entra-officer' } }
			});
			assert.deepStrictEqual(result.AssessorInspector, {
				connectOrCreate: { where: { idpUserId: 'entra-assessor' }, create: { idpUserId: 'entra-assessor' } }
			});
			assert.deepStrictEqual(result.PlanningOfficer, {
				connectOrCreate: { where: { idpUserId: 'entra-planning' }, create: { idpUserId: 'entra-planning' } }
			});
			assert.deepStrictEqual(result.Reader, {
				connectOrCreate: { where: { idpUserId: 'entra-reader' }, create: { idpUserId: 'entra-reader' } }
			});
		});

		it('disconnects a role when cleared with null or an empty string', () => {
			const answers: UpdateCaseAnswers = {
				caseOfficerId: null,
				readerId: ''
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.CaseOfficer, { disconnect: true });
			assert.deepStrictEqual(result.Reader, { disconnect: true });
		});

		it('does not touch roles that are absent from the payload', () => {
			const result = new S62aCaseUpdateMapper({ caseOfficerId: 'entra-officer' }).generateUpdateInput();

			assert.strictEqual(result.AssessorInspector, undefined);
			assert.strictEqual(result.PlanningOfficer, undefined);
			assert.strictEqual(result.Reader, undefined);
		});

		it('replaces the inspector rows wholesale, connecting or creating each User', () => {
			const answers: UpdateCaseAnswers = {
				manageCaseTeamInspectors: [
					{
						id: 'inspector-row-1',
						inspectorId: 'entra-1',
						inspectorAssignedDate: allocated,
						inspectorAppointedDate: allocated
					},
					{ id: 'inspector-row-2', inspectorId: 'entra-2' }
				]
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.Inspectors, {
				deleteMany: {},
				create: [
					{
						User: { connectOrCreate: { where: { idpUserId: 'entra-1' }, create: { idpUserId: 'entra-1' } } },
						assignedDate: allocated,
						appointedDate: allocated
					},
					{
						User: { connectOrCreate: { where: { idpUserId: 'entra-2' }, create: { idpUserId: 'entra-2' } } },
						assignedDate: null,
						appointedDate: null
					}
				]
			});
		});

		it('clears every inspector row when the list is empty', () => {
			const answers: UpdateCaseAnswers = { manageCaseTeamInspectors: [] };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.Inspectors, { deleteMany: {}, create: [] });
		});

		it('clears every inspector row when the list is null', () => {
			const answers: UpdateCaseAnswers = { manageCaseTeamInspectors: null };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.Inspectors, { deleteMany: {}, create: [] });
		});

		it('does not touch the inspector rows when the list is absent from the payload', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.Inspectors, undefined);
		});

		it('skips list items with no inspector selected', () => {
			const answers: UpdateCaseAnswers = {
				manageCaseTeamInspectors: [
					{ id: 'inspector-row-1', inspectorId: 'entra-1' },
					{ id: 'inspector-row-2', inspectorAssignedDate: allocated }
				]
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			// a row with a date but no user cannot be created — the FK is required
			assert.strictEqual((result.Inspectors as any).create.length, 1);
		});

		it('converts an ISO date string into a Date', () => {
			const answers = {
				manageCaseTeamInspectors: [
					{ id: 'inspector-row-1', inspectorId: 'entra-1', inspectorAssignedDate: '2026-07-01T09:00:00Z' }
				]
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			const created = (result.Inspectors as any).create[0];
			assert.ok(created.assignedDate instanceof Date);
			assert.deepStrictEqual(created.assignedDate, allocated);
		});
	});

	describe('Pre-Application Tab', () => {
		const receivedDate = new Date('2026-05-01T09:00:00Z');
		const issuedDate = new Date('2026-06-01T09:00:00Z');

		it('connects the advice lookup when an id is provided', () => {
			const answers: UpdateCaseAnswers = { preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.PreApplicationAdvice, {
				connect: { id: PRE_APPLICATION_ADVICE_ID.COUNCIL }
			});
		});

		it('connects the "No" option rather than treating it as cleared', () => {
			const answers: UpdateCaseAnswers = { preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.PreApplicationAdvice, {
				connect: { id: PRE_APPLICATION_ADVICE_ID.NO }
			});
		});

		it('disconnects the advice lookup when cleared with null or an empty string', () => {
			assert.deepStrictEqual(
				new S62aCaseUpdateMapper({ preApplicationAdviceId: null }).generateUpdateInput().PreApplicationAdvice,
				{ disconnect: true }
			);
			assert.deepStrictEqual(
				new S62aCaseUpdateMapper({ preApplicationAdviceId: '' }).generateUpdateInput().PreApplicationAdvice,
				{ disconnect: true }
			);
		});

		it('maps the reference, clearing to null when empty', () => {
			assert.strictEqual(
				new S62aCaseUpdateMapper({ preApplicationReference: 'PREAPP/123' }).generateUpdateInput()
					.preApplicationReference,
				'PREAPP/123'
			);
			assert.strictEqual(
				new S62aCaseUpdateMapper({ preApplicationReference: '' }).generateUpdateInput().preApplicationReference,
				null
			);
		});

		it('maps both dates into the S62aDates upsert', () => {
			const answers: UpdateCaseAnswers = {
				preApplicationReceivedDate: receivedDate,
				preApplicationAdviceIssuedDate: issuedDate
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: {
						preApplicationReceivedDate: receivedDate,
						preApplicationAdviceIssuedDate: issuedDate
					},
					update: {
						preApplicationReceivedDate: receivedDate,
						preApplicationAdviceIssuedDate: issuedDate
					}
				}
			});
		});

		it('nullifies the dates when cleared', () => {
			const answers: UpdateCaseAnswers = {
				preApplicationReceivedDate: null,
				preApplicationAdviceIssuedDate: null
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { preApplicationReceivedDate: null, preApplicationAdviceIssuedDate: null },
					update: { preApplicationReceivedDate: null, preApplicationAdviceIssuedDate: null }
				}
			});
		});

		it('does not emit pre-application fields when absent from the payload', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.PreApplicationAdvice, undefined);
			assert.strictEqual(result.preApplicationReference, undefined);
			assert.strictEqual(result.S62aDates, undefined);
		});
	});

	describe('Outcome Tab', () => {
		const decisionDate = new Date('2026-10-01T09:00:00Z');
		const recoveredReportSentDate = new Date('2026-10-15T09:00:00Z');

		it('connects both lookups when ids are provided', () => {
			const answers: UpdateCaseAnswers = {
				outcomeTypeId: OUTCOME_TYPE_ID.DECISION,
				decisionOutcomeId: DECISION_OUTCOME_ID.GRANTED_WITH_CONDITIONS
			};
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.OutcomeType, { connect: { id: OUTCOME_TYPE_ID.DECISION } });
			assert.deepStrictEqual(result.DecisionOutcome, {
				connect: { id: DECISION_OUTCOME_ID.GRANTED_WITH_CONDITIONS }
			});
		});

		it('connects the "Refused" outcome rather than treating it as cleared', () => {
			const answers: UpdateCaseAnswers = { decisionOutcomeId: DECISION_OUTCOME_ID.REFUSED };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.DecisionOutcome, { connect: { id: DECISION_OUTCOME_ID.REFUSED } });
		});

		it('disconnects the lookups when cleared with null or an empty string', () => {
			assert.deepStrictEqual(new S62aCaseUpdateMapper({ outcomeTypeId: null }).generateUpdateInput().OutcomeType, {
				disconnect: true
			});
			assert.deepStrictEqual(
				new S62aCaseUpdateMapper({ decisionOutcomeId: '' }).generateUpdateInput().DecisionOutcome,
				{ disconnect: true }
			);
		});

		it('maps both dates into the S62aDates upsert', () => {
			const answers: UpdateCaseAnswers = { decisionDate, recoveredReportSentDate };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { decisionDate, recoveredReportSentDate },
					update: { decisionDate, recoveredReportSentDate }
				}
			});
		});

		it('nullifies the dates when cleared', () => {
			const answers: UpdateCaseAnswers = { decisionDate: null, recoveredReportSentDate: null };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { decisionDate: null, recoveredReportSentDate: null },
					update: { decisionDate: null, recoveredReportSentDate: null }
				}
			});
		});

		it('does not touch recoveredDate when only recoveredReportSentDate is provided', () => {
			const result = new S62aCaseUpdateMapper({ recoveredReportSentDate }).generateUpdateInput();

			assert.deepStrictEqual(result.S62aDates, {
				upsert: {
					create: { recoveredReportSentDate },
					update: { recoveredReportSentDate }
				}
			});
			assert.strictEqual((result.S62aDates?.upsert.create as any).recoveredDate, undefined);
		});

		it('does not emit outcome fields when absent from the payload', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.OutcomeType, undefined);
			assert.strictEqual(result.DecisionOutcome, undefined);
			assert.strictEqual(result.S62aDates, undefined);
		});
	});

	describe('Event Tab', () => {
		const hearingDate = new Date('2026-09-01T09:00:00Z');
		const siteVisitDate = new Date('2026-09-05T09:00:00Z');

		it('does not generate an S62aEvent update if no event answers are provided', () => {
			const result = new S62aCaseUpdateMapper({}).generateUpdateInput();

			assert.strictEqual(result.S62aEvent, undefined);
		});

		it('maps event dates into the S62aEvent upsert', () => {
			const answers: UpdateCaseAnswers = { hearingDate, siteVisitDate };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aEvent, {
				upsert: {
					create: { hearingDate, siteVisitDate },
					update: { hearingDate, siteVisitDate }
				}
			});
		});

		it('converts the durations to Decimals, allowing string input from the multi-field form', () => {
			const answers = {
				prepDuration: '2',
				sittingDuration: 3.5,
				reportingDuration: 0
			} as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			const created = (result.S62aEvent as any).upsert.create;
			assert.deepStrictEqual(created.prepDuration, new Prisma.Decimal(2));
			assert.deepStrictEqual(created.sittingDuration, new Prisma.Decimal(3.5));
			assert.deepStrictEqual(created.reportingDuration, new Prisma.Decimal(0));
		});

		it('nullifies a duration cleared to an empty string', () => {
			const answers = { prepDuration: '' } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual((result.S62aEvent as any).upsert.create.prepDuration, null);
		});

		it('maps the venue, clearing to null when empty', () => {
			assert.strictEqual(
				(new S62aCaseUpdateMapper({ venue: 'Town Hall' }).generateUpdateInput().S62aEvent as any).upsert.create.venue,
				'Town Hall'
			);
			assert.strictEqual(
				(new S62aCaseUpdateMapper({ venue: '' }).generateUpdateInput().S62aEvent as any).upsert.create.venue,
				null
			);
		});

		it('connects the site visit type lookup when an id is provided', () => {
			const answers: UpdateCaseAnswers = { siteVisitTypeId: SITE_VISIT_TYPE_ID.UNACCOMPANIED };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual((result.S62aEvent as any).upsert.create.SiteVisitType, {
				connect: { id: SITE_VISIT_TYPE_ID.UNACCOMPANIED }
			});
		});

		it('disconnects the site visit type when cleared', () => {
			const answers: UpdateCaseAnswers = { siteVisitTypeId: null };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual((result.S62aEvent as any).upsert.update.SiteVisitType, { disconnect: true });
		});

		it('does not write the site visit type as a scalar column', () => {
			const answers: UpdateCaseAnswers = { siteVisitTypeId: SITE_VISIT_TYPE_ID.ACCESS_REQUIRED };
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual((result.S62aEvent as any).upsert.create.siteVisitTypeId, undefined);
		});

		it('does not put event fields on the case itself', () => {
			const result = new S62aCaseUpdateMapper({ hearingDate }).generateUpdateInput();

			assert.strictEqual((result as any).hearingDate, undefined);
			assert.strictEqual(result.S62aDates, undefined);
		});
	});

	describe('Waste Tab', () => {
		it('maps the description, clearing to null when empty', () => {
			assert.strictEqual(
				new S62aCaseUpdateMapper({ wasteActivitiesDescription: 'Sorting and baling' }).generateUpdateInput()
					.wasteActivitiesDescription,
				'Sorting and baling'
			);
			assert.strictEqual(
				new S62aCaseUpdateMapper({ wasteActivitiesDescription: '' }).generateUpdateInput().wasteActivitiesDescription,
				null
			);
		});

		it('maps the waste management boolean', () => {
			const answers = { isWasteManagementDevelopment: true } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.isWasteManagementDevelopment, true);
		});

		it('maps a false boolean rather than treating it as cleared', () => {
			const answers = { isWasteManagementDevelopment: false } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.isWasteManagementDevelopment, false);
		});

		it('nullifies the boolean when cleared', () => {
			const answers = { isWasteManagementDevelopment: null } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual(result.isWasteManagementDevelopment, null);
		});

		it('replaces the waste type rows wholesale, collapsing the conditional amounts', () => {
			const answers = {
				manageWasteTypes: [
					{
						id: 'row-1',
						wasteTypeId: WASTE_TYPE_ID.INERT_LANDFILL,
						voidCapacityUnitId: WASTE_UNIT_ID.CUBIC_METRES,
						[`voidCapacityUnitId_${WASTE_UNIT_ID.CUBIC_METRES}`]: '34',
						maxAnnualThroughputUnitId: WASTE_UNIT_ID.TONNES,
						[`maxAnnualThroughputUnitId_${WASTE_UNIT_ID.TONNES}`]: '55'
					}
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.WasteTypes, {
				deleteMany: {},
				create: [
					{
						WasteType: { connect: { id: WASTE_TYPE_ID.INERT_LANDFILL } },
						voidCapacity: new Prisma.Decimal(34),
						VoidCapacityUnit: { connect: { id: WASTE_UNIT_ID.CUBIC_METRES } },
						maxAnnualThroughput: new Prisma.Decimal(55),
						MaxAnnualThroughputUnit: { connect: { id: WASTE_UNIT_ID.TONNES } }
					}
				]
			});
		});

		it('ignores the amounts for units that were not selected', () => {
			const answers = {
				manageWasteTypes: [
					{
						id: 'row-1',
						wasteTypeId: WASTE_TYPE_ID.INERT_LANDFILL,
						voidCapacityUnitId: WASTE_UNIT_ID.TONNES,
						// the hidden reveals still submit their inputs, so both arrive
						[`voidCapacityUnitId_${WASTE_UNIT_ID.CUBIC_METRES}`]: '999',
						[`voidCapacityUnitId_${WASTE_UNIT_ID.TONNES}`]: '12'
					}
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();
			const [created] = (result.WasteTypes as any).create;

			assert.deepStrictEqual(created.voidCapacity, new Prisma.Decimal(12));
		});

		it('writes a null amount when the selected unit has no value', () => {
			const answers = {
				manageWasteTypes: [
					{
						id: 'row-1',
						wasteTypeId: WASTE_TYPE_ID.MUNICIPAL,
						maxAnnualThroughputUnitId: WASTE_UNIT_ID.LITRES,
						[`maxAnnualThroughputUnitId_${WASTE_UNIT_ID.LITRES}`]: ''
					}
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();
			const [created] = (result.WasteTypes as any).create;

			assert.strictEqual(created.maxAnnualThroughput, null);
			assert.strictEqual(created.voidCapacity, null);
			assert.strictEqual(created.VoidCapacityUnit, undefined);
		});

		it('skips rows with no waste type selected', () => {
			const answers = {
				manageWasteTypes: [
					{ id: 'row-1', wasteTypeId: WASTE_TYPE_ID.INERT_LANDFILL },
					{ id: 'row-2', voidCapacityUnitId: WASTE_UNIT_ID.TONNES }
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual((result.WasteTypes as any).create.length, 1);
		});

		it('clears every waste type row when the list is empty', () => {
			const answers = { manageWasteTypes: [] } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.WasteTypes, { deleteMany: {}, create: [] });
		});

		it('clears every waste type row when the list is null', () => {
			const answers = { manageWasteTypes: null } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.WasteTypes, { deleteMany: {}, create: [] });
		});

		it('does not touch the waste type rows when the list is absent from the payload', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.WasteTypes, undefined);
		});
	});

	describe('Residential Tab', () => {
		it('maps the booleans into the S62aResidential upsert', () => {
			const answers = {
				hasResidentialUnitsChange: true,
				hasExistingHousing: false
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.deepStrictEqual(result.S62aResidential, {
				upsert: {
					create: { hasResidentialUnitsChange: true, hasExistingHousing: false },
					update: { hasResidentialUnitsChange: true, hasExistingHousing: false }
				}
			});
		});

		it('nullifies a boolean when cleared', () => {
			const answers = { hasProposedHousing: null } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual((result.S62aResidential as any).upsert.create.hasProposedHousing, null);
		});

		it('does not generate an S62aResidential update when no residential answers are provided', () => {
			const result = new S62aCaseUpdateMapper({ likelyIssues: 'Traffic' }).generateUpdateInput();

			assert.strictEqual(result.S62aResidential, undefined);
		});

		it('maps the housing entries into nested creates, connecting the lookups', () => {
			const answers = {
				manageProposedHousing: [
					{
						id: 'row-1',
						occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
						unitTypeId: UNIT_TYPE_ID.HOUSES,
						bedroomsUnknown: '0',
						bedroomsOne: '4',
						bedroomsTwo: '6',
						bedroomsThree: '',
						bedroomsFourPlus: '2'
					}
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();
			const [created] = (result.S62aResidential as any).upsert.create.Housing.create;

			assert.deepStrictEqual(created.HousingType, { connect: { id: HOUSING_TYPE_ID.PROPOSED } });
			assert.deepStrictEqual(created.OccupancyType, { connect: { id: OCCUPANCY_TYPE_ID.MARKET_HOUSING } });
			assert.deepStrictEqual(created.UnitType, { connect: { id: UNIT_TYPE_ID.HOUSES } });

			// Bands arrive as strings from the multi-field input
			assert.strictEqual(created.bedroomsOne, 4);
			assert.strictEqual(created.bedroomsFourPlus, 2);
		});

		it('keeps a zero band distinct from an unanswered one', () => {
			const answers = {
				manageProposedHousing: [
					{
						id: 'row-1',
						occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
						unitTypeId: UNIT_TYPE_ID.HOUSES,
						bedroomsUnknown: '0',
						bedroomsOne: ''
					}
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();
			const [created] = (result.S62aResidential as any).upsert.create.Housing.create;

			assert.strictEqual(created.bedroomsUnknown, 0, 'zero units recorded');
			assert.strictEqual(created.bedroomsOne, null, 'band never answered');
		});

		it('scopes the delete to proposed so saving does not wipe the existing entries', () => {
			const answers = {
				manageProposedHousing: [
					{ id: 'row-1', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, unitTypeId: UNIT_TYPE_ID.HOUSES }
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();
			const { update } = (result.S62aResidential as any).upsert;

			assert.deepStrictEqual(update.Housing.deleteMany, { housingTypeId: HOUSING_TYPE_ID.PROPOSED });
			assert.strictEqual(update.Housing.create.length, 1);
		});

		it('does not delete anything on create, as there is nothing to replace', () => {
			const answers = { manageProposedHousing: [] } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			const { create } = (result.S62aResidential as any).upsert;
			assert.deepStrictEqual(create.Housing, { create: [] });
			assert.strictEqual(create.Housing.deleteMany, undefined);
		});

		it('clears every housing row when the list is empty', () => {
			const answers = { manageProposedHousing: [] } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			// Not hasAnswer(), which is false for [] — removing the last entry must persist
			assert.deepStrictEqual((result.S62aResidential as any).upsert.update.Housing, {
				deleteMany: { housingTypeId: HOUSING_TYPE_ID.PROPOSED },
				create: []
			});
		});

		it('does not touch the housing rows when the list is absent from the payload', () => {
			const answers = { hasProposedHousing: true } as unknown as UpdateCaseAnswers;
			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.strictEqual((result.S62aResidential as any).upsert.create.Housing, undefined);
			assert.strictEqual((result.S62aResidential as any).upsert.update.Housing, undefined);
		});

		it('maps housing entries even when no booleans are in the payload', () => {
			const answers = {
				manageProposedHousing: [
					{ id: 'row-1', occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING, unitTypeId: UNIT_TYPE_ID.HOUSES }
				]
			} as unknown as UpdateCaseAnswers;

			const result = new S62aCaseUpdateMapper(answers).generateUpdateInput();

			assert.ok(result.S62aResidential, 'the upsert must still be generated');
		});
	});
});

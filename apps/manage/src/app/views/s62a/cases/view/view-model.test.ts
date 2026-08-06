import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	SITE_AREA_UNIT_ID,
	APPLICANT_TYPE_ID,
	CONTACT_ROLES_ID,
	PRE_APPLICATION_ADVICE_ID,
	OUTCOME_TYPE_ID,
	DECISION_OUTCOME_ID,
	SITE_VISIT_TYPE_ID,
	WASTE_TYPE_ID,
	WASTE_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { s62aCaseToViewModel, type S62aCaseDbModel } from './view-model.ts';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';

const mockDate = new Date('2026-07-14T12:00:00Z');

const createMockDecimal = (value: number) => ({
	toNumber: () => value,
	dividedBy: (divisor: number) => ({
		toFixed: (decimals: number) => (value / divisor).toFixed(decimals)
	})
});

describe('s62aCaseToViewModel', () => {
	it('maps and renames core fields from the database record', () => {
		const mockDbCase = {
			id: 'case-123',
			reference: 'S62A/2026/0001',
			description: 'A massive new development',
			typeId: 'type-123',
			lpaId: 'lpa-123',
			hasSecondaryLpa: false,
			expectedSubmissionDate: mockDate,
			s62aStatusId: 'status-new',
			S62aStatus: {
				id: 'status-new',
				displayName: 'New'
			},
			siteIsVisibleFromPublicLand: true,
			likelyIssues: 'Traffic and noise',
			siteNorthing: 123456,
			siteEasting: 654321,
			applicationPhaseId: 'phase-1'
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		// passed through unchanged
		assert.strictEqual(result.id, 'case-123');
		assert.strictEqual(result.reference, 'S62A/2026/0001');
		assert.strictEqual(result.typeId, 'type-123');
		assert.strictEqual(result.lpaId, 'lpa-123');
		assert.strictEqual(result.expectedSubmissionDate, mockDate);

		// renamed field
		assert.strictEqual(result.developmentDescription, 'A massive new development');

		// booleans become YesNo strings
		assert.strictEqual(result.hasSecondaryLpa, 'no');
		assert.strictEqual(result.siteIsVisibleFromPublicLand, 'yes');

		// relation ids and other direct fields
		assert.strictEqual(result.s62aStatusId, 'status-new');
		assert.strictEqual(result.applicationPhaseId, 'phase-1');
		assert.strictEqual(result.likelyIssues, 'Traffic and noise');
		assert.strictEqual(result.siteNorthing, 123456);
		assert.strictEqual(result.siteEasting, 654321);
	});

	it('maps null database values to undefined in the view model', () => {
		const mockDbCase = {
			id: 'case-456',
			reference: 'S62A/2026/0002',
			description: 'Another development',
			typeId: 'type-456',
			lpaId: null,
			hasSecondaryLpa: true,
			expectedSubmissionDate: mockDate,
			S62aStatus: null,
			applicationPhaseId: null,
			classificationId: null,
			likelyIssues: null,
			siteNorthing: null,
			siteIsVisibleFromPublicLand: null,
			representationsPublishDate: null
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		// relation ids
		assert.strictEqual(result.s62aStatusId, undefined);
		assert.strictEqual(result.applicationPhaseId, undefined);
		assert.strictEqual(result.classificationId, undefined);

		// direct and integer fields
		assert.strictEqual(result.likelyIssues, undefined);
		assert.strictEqual(result.siteNorthing, undefined);
		assert.strictEqual(result.representationsPublishDate, undefined);

		// optional booleans
		assert.strictEqual(result.siteIsVisibleFromPublicLand, undefined);

		// lpaId is assigned directly rather than via the nullable field loop,
		// so a null is preserved rather than converted to undefined
		assert.strictEqual(result.lpaId, null);

		// fields absent from the record are simply absent
		assert.strictEqual(result.siteEasting, undefined);
	});

	it('combines representations period start and end into a single object', () => {
		const startDate = new Date('2026-07-20T10:00:00Z');
		const endDate = new Date('2026-08-20T10:00:00Z');

		const mockDbCase = {
			id: 'case-reps-1',
			reference: 'S62A/2026/0015',
			description: 'Representations case',
			typeId: 'type-1',
			lpaId: 'lpa-1',
			hasSecondaryLpa: false,
			expectedSubmissionDate: mockDate,
			representationsPeriodStartDate: startDate,
			representationsPeriodEndDate: endDate
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.deepStrictEqual(result.representationsPeriod, {
			start: startDate,
			end: endDate
		});
	});

	it('does not create representationsPeriod object if neither date is present', () => {
		const mockDbCase = {
			id: 'case-reps-2',
			reference: 'S62A/2026/0016',
			description: 'Representations case',
			typeId: 'type-1',
			lpaId: 'lpa-1',
			hasSecondaryLpa: false,
			expectedSubmissionDate: mockDate,
			representationsPeriodStartDate: null,
			representationsPeriodEndDate: null
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.strictEqual(result.representationsPeriod, undefined);
	});

	it('calculates site area correctly when the unit is square metres', () => {
		const mockDbCase = {
			id: 'case-789',
			reference: 'S62A/2026/0003',
			description: 'Area test 1',
			typeId: 'type-789',
			lpaId: 'lpa-789',
			hasSecondaryLpa: false,
			expectedSubmissionDate: mockDate,
			siteAreaInSquareMetres: createMockDecimal(25000),
			siteAreaOriginalUnitId: SITE_AREA_UNIT_ID.METRES_SQUARED
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.strictEqual(result.siteAreaSquareMetres, 25000);
		assert.strictEqual(result.siteAreaHectares, undefined);
	});

	it('calculates site area correctly when the unit is hectares', () => {
		const mockDbCase = {
			id: 'case-999',
			reference: 'S62A/2026/0004',
			description: 'Area test 2',
			typeId: 'type-999',
			lpaId: 'lpa-999',
			hasSecondaryLpa: false,
			expectedSubmissionDate: mockDate,
			siteAreaInSquareMetres: createMockDecimal(45600),
			siteAreaOriginalUnitId: SITE_AREA_UNIT_ID.HECTARES
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.strictEqual(result.siteAreaHectares, 4.56);
		assert.strictEqual(result.siteAreaSquareMetres, undefined);
	});

	describe('Dates Mapping', () => {
		it('maps standard date fields from S62aDates to the root of the view model', () => {
			const mockDbCase = {
				id: 'case-date-1',
				reference: 'S62A/2026/0005',
				expectedSubmissionDate: mockDate,
				S62aDates: {
					applicationReceivedDate: mockDate,
					targetPublishDate: mockDate,
					s106SubmittedDate: mockDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.applicationReceivedDate, mockDate);
			assert.strictEqual(result.targetPublishDate, mockDate);
			assert.strictEqual(result.s106SubmittedDate, mockDate);
		});

		it('combines reconsultation details dates into a single object', () => {
			const startDate = new Date('2026-07-20T10:00:00Z');
			const endDate = new Date('2026-08-20T10:00:00Z');

			const mockDbCase = {
				id: 'case-date-2',
				reference: 'S62A/2026/0006',
				expectedSubmissionDate: mockDate,
				S62aDates: {
					reconsultationDetailsSentDate: startDate,
					reconsultationDetailsDeadlineDate: endDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.reconsultationDetailsDate, {
				start: startDate,
				end: endDate
			});
		});

		it('handles partial reconsultation details dates (start only)', () => {
			const startDate = new Date('2026-07-20T10:00:00Z');

			const mockDbCase = {
				id: 'case-date-3',
				reference: 'S62A/2026/0007',
				expectedSubmissionDate: mockDate,
				S62aDates: {
					reconsultationDetailsSentDate: startDate,
					reconsultationDetailsDeadlineDate: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.reconsultationDetailsDate, {
				start: startDate
			});
		});

		it('handles partial reconsultation details dates (end only)', () => {
			const endDate = new Date('2026-08-20T10:00:00Z');

			const mockDbCase = {
				id: 'case-date-4',
				reference: 'S62A/2026/0008',
				expectedSubmissionDate: mockDate,
				S62aDates: {
					reconsultationDetailsSentDate: null,
					reconsultationDetailsDeadlineDate: endDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.reconsultationDetailsDate, {
				end: endDate
			});
		});

		it('does not create reconsultationDetailsDate object if neither date is present', () => {
			const mockDbCase = {
				id: 'case-date-5',
				reference: 'S62A/2026/0009',
				expectedSubmissionDate: mockDate,
				S62aDates: {
					reconsultationDetailsSentDate: null,
					reconsultationDetailsDeadlineDate: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.reconsultationDetailsDate, undefined);
		});
	});

	describe('Fees Mapping', () => {
		it('does not map fee fields if S62aFees is missing', () => {
			const mockDbCase = {
				id: 'case-fee-1',
				reference: 'S62A/2026/0010',
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hasPreApplicationFee, undefined);
			assert.strictEqual(result.preApplicationFee, undefined);
			assert.strictEqual(result.customerNumber, undefined);
		});

		it('maps fee boolean fields to YesNo string values', () => {
			const mockDbCase = {
				id: 'case-fee-2',
				reference: 'S62A/2026/0011',
				expectedSubmissionDate: mockDate,
				S62aFees: {
					hasPreApplicationFee: true,
					hasApplicationFee: false,
					eligibleForFeeRefund: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hasPreApplicationFee, 'yes');
			assert.strictEqual(result.hasApplicationFee, 'no');
			assert.strictEqual(result.eligibleForFeeRefund, undefined);
		});

		it('maps fee decimal fields to standard numbers', () => {
			const mockDbCase = {
				id: 'case-fee-3',
				reference: 'S62A/2026/0012',
				expectedSubmissionDate: mockDate,
				S62aFees: {
					preApplicationFee: createMockDecimal(1500.5),
					applicationFee: createMockDecimal(0),
					applicationFeeRefundAmount: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.preApplicationFee, 1500.5);
			assert.strictEqual(result.applicationFee, 0);
			assert.strictEqual(result.applicationFeeRefundAmount, undefined);
		});

		it('maps fee date fields correctly', () => {
			const date = new Date('2026-08-01T10:00:00Z');
			const mockDbCase = {
				id: 'case-fee-4',
				reference: 'S62A/2026/0013',
				expectedSubmissionDate: mockDate,
				S62aFees: {
					invoiceDate: date,
					applicationFeeReceivedDate: date,
					chargingScheduleSentDate: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.invoiceDate, date);
			assert.strictEqual(result.applicationFeeReceivedDate, date);
			assert.strictEqual(result.chargingScheduleSentDate, undefined);
		});

		it('maps fee string fields correctly', () => {
			const mockDbCase = {
				id: 'case-fee-5',
				reference: 'S62A/2026/0014',
				expectedSubmissionDate: mockDate,
				S62aFees: {
					customerNumber: '123456'
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.customerNumber, '123456');
		});
	});

	describe('Details Tab Mapping', () => {
		it('maps relation id, string, boolean and CIL fields when present', () => {
			const mockDbCase = {
				id: 'case-det-1',
				reference: 'S62A/2026/0010',
				description: 'Details case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				stageId: 'validation',
				categoryId: 'major-minerals',
				procedureId: 'hearing',
				lpaReference: 'LPA/123',
				listedBuildingReference: 'LBC/456',
				healthAndSafetyIssue: 'Asbestos present',
				isGreenBelt: true,
				cilLiable: false,
				bngExempt: true,
				cilAmount: createMockDecimal(1500.5)
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.stageId, 'validation');
			assert.strictEqual(result.categoryId, 'major-minerals');
			assert.strictEqual(result.procedureId, 'hearing');
			assert.strictEqual(result.lpaReference, 'LPA/123');
			assert.strictEqual(result.listedBuildingReference, 'LBC/456');
			assert.strictEqual(result.healthAndSafetyIssue, 'Asbestos present');
			assert.strictEqual(result.isGreenBelt, 'yes');
			assert.strictEqual(result.cilLiable, 'no');
			assert.strictEqual(result.bngExempt, 'yes');
			assert.strictEqual(result.cilAmount, 1500.5);
		});

		it('maps boolean "No" (false) distinctly from unanswered (null)', () => {
			const mockDbCase = {
				id: 'case-det-2',
				reference: 'S62A/2026/0011',
				description: 'Boolean case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				isGreenBelt: false,
				cilLiable: null,
				bngExempt: null
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.isGreenBelt, 'no');
			assert.strictEqual(result.cilLiable, undefined);
			assert.strictEqual(result.bngExempt, undefined);
		});

		it('leaves Details fields undefined when null in the database', () => {
			const mockDbCase = {
				id: 'case-det-3',
				reference: 'S62A/2026/0012',
				description: 'Empty details case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				stageId: null,
				categoryId: null,
				procedureId: null,
				lpaReference: null,
				listedBuildingReference: null,
				healthAndSafetyIssue: null,
				isGreenBelt: null,
				cilLiable: null,
				bngExempt: null,
				cilAmount: null
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.stageId, undefined);
			assert.strictEqual(result.categoryId, undefined);
			assert.strictEqual(result.procedureId, undefined);
			assert.strictEqual(result.lpaReference, undefined);
			assert.strictEqual(result.listedBuildingReference, undefined);
			assert.strictEqual(result.healthAndSafetyIssue, undefined);
			assert.strictEqual(result.isGreenBelt, undefined);
			assert.strictEqual(result.cilLiable, undefined);
			assert.strictEqual(result.bngExempt, undefined);
			assert.strictEqual(result.cilAmount, undefined);
		});

		it('passes updatedDate and createdDate through as raw Dates', () => {
			const created = new Date('2026-07-22T12:45:00Z');
			const updated = new Date('2026-07-22T12:46:00Z');
			const mockDbCase = {
				id: 'case-det-4',
				reference: 'S62A/2026/0013',
				description: 'Date passthrough case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				createdDate: created,
				updatedDate: updated
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.createdDate, created);
			assert.strictEqual(result.updatedDate, updated);
		});
	});

	describe('LPA and Contact Mapping', () => {
		it('maps LPA and Secondary LPA addresses and contacts correctly', () => {
			const mockDbCase = {
				id: 'case-lpa-1',
				reference: 'S62A/2026/0015',
				expectedSubmissionDate: mockDate,
				Lpa: {
					Address: { line1: '1 LPA Street', townCity: 'Town', postcode: 'AB1 2CD' }
				},
				SecondaryLpa: {
					Address: { line1: '2 Secondary St', townCity: 'City', postcode: 'EF3 4GH' }
				},
				LpaContact: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@lpa.gov.uk',
					telephoneNumber: '0123456789'
				},
				SecondaryLpaContact: {
					firstName: 'Jane',
					lastName: 'Smith',
					email: 'jane@lpa.gov.uk',
					telephoneNumber: '0987654321'
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.lpaAddress, {
				id: undefined,
				addressLine1: '1 LPA Street',
				addressLine2: '',
				townCity: 'Town',
				county: '',
				postcode: 'AB1 2CD'
			});
			assert.deepStrictEqual(result.secondaryLpaAddress, {
				id: undefined,
				addressLine1: '2 Secondary St',
				addressLine2: '',
				townCity: 'City',
				county: '',
				postcode: 'EF3 4GH'
			});

			assert.strictEqual(result.lpaFirstName, 'John');
			assert.strictEqual(result.lpaLastName, 'Doe');
			assert.strictEqual(result.lpaEmailAddress, 'john@lpa.gov.uk');
			assert.strictEqual(result.lpaPhoneNumber, '0123456789');

			assert.strictEqual(result.secondaryLpaFirstName, 'Jane');
			assert.strictEqual(result.secondaryLpaLastName, 'Smith');
			assert.strictEqual(result.secondaryLpaEmailAddress, 'jane@lpa.gov.uk');
			assert.strictEqual(result.secondaryLpaPhoneNumber, '0987654321');
		});
	});

	describe('Parties (Agents and Applicants) Mapping', () => {
		it('maps Agent details including nested contacts correctly', () => {
			const mockDbCase = {
				id: 'case-parties-1',
				reference: 'S62A/2026/0016',
				expectedSubmissionDate: mockDate,
				S62aToApplicants: [
					{
						id: 'rel-agent-1',
						roleId: CONTACT_ROLES_ID.AGENT,
						Organisation: {
							id: 'org-agent-1',
							name: 'Agent Corp',
							addressId: 'addr-agent-1',
							Address: { id: 'addr-agent-1', line1: 'Agent Line 1' },
							OrganisationToContact: [
								{
									id: 'otc-agent-1',
									Contact: { id: 'contact-agent-1', firstName: 'Agent', lastName: 'Smith' }
								}
							]
						}
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.agentRelationId, 'rel-agent-1');
			assert.strictEqual(result.agentOrganisationId, 'org-agent-1');
			assert.strictEqual(result.agentName, 'Agent Corp');
			assert.strictEqual(result.agentOrganisationAddressId, 'addr-agent-1');
			assert.deepStrictEqual(result.agentAddress, {
				id: 'addr-agent-1',
				addressLine1: 'Agent Line 1',
				addressLine2: '',
				townCity: '',
				county: '',
				postcode: ''
			});

			assert.deepStrictEqual(result.manageAgentContactDetails, [
				{
					id: 'contact-agent-1',
					organisationToContactRelationId: 'otc-agent-1',
					agentFirstName: 'Agent',
					agentLastName: 'Smith',
					agentContactEmail: undefined,
					agentContactTelephoneNumber: undefined
				}
			]);
		});

		it('maps Applicant details correctly when applicant is an ORGANISATION', () => {
			const mockDbCase = {
				id: 'case-parties-2',
				reference: 'S62A/2026/0017',
				expectedSubmissionDate: mockDate,
				applicantTypeId: APPLICANT_TYPE_ID.ORGANISATION,
				S62aToApplicants: [
					{
						id: 'rel-app-org-1',
						roleId: CONTACT_ROLES_ID.APPLICANT,
						Organisation: {
							id: 'org-app-1',
							name: 'Applicant Corp',
							addressId: 'addr-app-1',
							Address: { id: 'addr-app-1', line1: 'App Line 1' },
							OrganisationToContact: [
								{
									id: 'otc-app-1',
									Contact: { id: 'contact-app-1', firstName: 'App', lastName: 'User', email: 'app@corp.com' }
								}
							]
						}
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageApplicantOrganisations, [
				{
					id: 'org-app-1',
					organisationRelationId: 'rel-app-org-1',
					organisationName: 'Applicant Corp',
					organisationAddressId: 'addr-app-1',
					organisationAddress: {
						id: 'addr-app-1',
						addressLine1: 'App Line 1',
						addressLine2: '',
						townCity: '',
						county: '',
						postcode: ''
					}
				}
			]);

			assert.deepStrictEqual(result.manageApplicantContactDetails, [
				{
					id: 'contact-app-1',
					organisationToContactRelationId: 'otc-app-1',
					applicantFirstName: 'App',
					applicantLastName: 'User',
					applicantContactEmail: 'app@corp.com',
					applicantContactTelephoneNumber: undefined,
					applicantContactOrganisation: 'org-app-1'
				}
			]);
		});

		it('maps Applicant details correctly when applicant is an INDIVIDUAL', () => {
			const mockDbCase = {
				id: 'case-parties-3',
				reference: 'S62A/2026/0018',
				expectedSubmissionDate: mockDate,
				applicantTypeId: APPLICANT_TYPE_ID.INDIVIDUAL,
				S62aToApplicants: [
					{
						id: 'rel-app-ind-1',
						roleId: CONTACT_ROLES_ID.APPLICANT,
						Contact: { id: 'contact-ind-1', firstName: 'Individual', lastName: 'Applicant' }
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageApplicantOrganisations, undefined);
			assert.deepStrictEqual(result.manageApplicantContactDetails, [
				{
					id: 'contact-ind-1',
					applicantRelationId: 'rel-app-ind-1',
					applicantFirstName: 'Individual',
					applicantLastName: 'Applicant',
					applicantContactEmail: undefined,
					applicantContactTelephoneNumber: undefined
				}
			]);
		});
	});

	describe('Additional Contacts Mapping', () => {
		it('maps standard additional contacts (e.g. interested-party) correctly, handling orgName to organisationName mapping', () => {
			const mockDbCase = {
				id: 'case-add-1',
				reference: 'S62A/2026/0019',
				expectedSubmissionDate: mockDate,
				S62aToApplicants: [
					{
						id: 'rel-add-1',
						roleId: CONTACT_ROLES_ID.INTERESTED_PARTY,
						Role: { displayName: 'Interested party' },
						Contact: {
							id: 'contact-add-1',
							firstName: 'Jane',
							lastName: 'Smith',
							orgName: 'Community Group',
							email: 'jane@example.com',
							telephoneNumber: '0123456789',
							Address: { id: 'addr-add-1', line1: '10 High St', townCity: 'Test Town' }
						}
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageAdditionalContacts, [
				{
					id: 'contact-add-1',
					additionalContactRelationId: 'rel-add-1',
					additionalContactType: CONTACT_ROLES_ID.INTERESTED_PARTY,
					otherContactType: undefined,
					additionalContactType_otherContactType: undefined,
					firstName: 'Jane',
					lastName: 'Smith',
					organisationName: 'Community Group',
					emailAddress: 'jane@example.com',
					phoneNumber: '0123456789',
					additionalContactAddress: {
						id: 'addr-add-1',
						addressLine1: '10 High St',
						addressLine2: '',
						townCity: 'Test Town',
						county: '',
						postcode: ''
					}
				}
			]);
		});

		it('maps custom "other" additional contacts correctly, separating the role ID into the conditional text fields', () => {
			const mockDbCase = {
				id: 'case-add-2',
				reference: 'S62A/2026/0020',
				expectedSubmissionDate: mockDate,
				S62aToApplicants: [
					{
						id: 'rel-add-2',
						roleId: 'local-mp',
						Role: { displayName: 'Local MP' },
						Contact: {
							id: 'contact-add-2',
							firstName: 'Bob',
							lastName: 'Builder'
						}
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageAdditionalContacts, [
				{
					id: 'contact-add-2',
					additionalContactRelationId: 'rel-add-2',
					additionalContactType: 'other',
					otherContactType: 'Local MP',
					additionalContactType_otherContactType: 'Local MP',
					firstName: 'Bob',
					lastName: 'Builder',
					organisationName: undefined,
					emailAddress: undefined,
					phoneNumber: undefined,
					additionalContactAddress: undefined
				}
			]);
		});
	});

	describe('EIA Mapping', () => {
		it('maps EIA screening booleans to YesNo string values', () => {
			const mockDbCase = {
				id: 'case-eia-1',
				reference: 'S62A/2026/0017',
				description: 'EIA case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				eiaScreening: true,
				eiaScreeningOutcome: false
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.eiaScreening, 'yes');
			assert.strictEqual(result.eiaScreeningOutcome, 'no');
		});

		it('maps EIA boolean "No" (false) distinctly from unanswered (null)', () => {
			const mockDbCase = {
				id: 'case-eia-2',
				reference: 'S62A/2026/0018',
				description: 'EIA case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				eiaScreening: false,
				eiaScreeningOutcome: null
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.eiaScreening, 'no');
			assert.strictEqual(result.eiaScreeningOutcome, undefined);
		});

		it('leaves EIA booleans undefined when absent from the record', () => {
			const mockDbCase = {
				id: 'case-eia-3',
				reference: 'S62A/2026/0019',
				description: 'EIA case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.eiaScreening, undefined);
			assert.strictEqual(result.eiaScreeningOutcome, undefined);
		});

		it('maps environmentalStatementReceivedDate from S62aDates to the root of the view model', () => {
			const esDate = new Date('2026-09-01T09:00:00Z');
			const mockDbCase = {
				id: 'case-eia-4',
				reference: 'S62A/2026/0020',
				expectedSubmissionDate: mockDate,
				S62aDates: {
					environmentalStatementReceivedDate: esDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.environmentalStatementReceivedDate, esDate);
		});

		it('leaves environmentalStatementReceivedDate undefined when null or when S62aDates is missing', () => {
			const withNullDate = {
				id: 'case-eia-5',
				reference: 'S62A/2026/0021',
				expectedSubmissionDate: mockDate,
				S62aDates: { environmentalStatementReceivedDate: null }
			} as unknown as S62aCaseDbModel;

			const withoutDates = {
				id: 'case-eia-6',
				reference: 'S62A/2026/0022',
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			assert.strictEqual(s62aCaseToViewModel(withNullDate).environmentalStatementReceivedDate, undefined);
			assert.strictEqual(s62aCaseToViewModel(withoutDates).environmentalStatementReceivedDate, undefined);
		});
	});

	describe('Press Notice View Model Mapping', () => {
		it('maps direct press notice fields and converts pressNoticeCost to a number', () => {
			const mockDbCase = {
				id: 'case-pn-1',
				reference: 'S62A/2026/0023',
				description: 'Press notice case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				pressNoticeCost: new Prisma.Decimal('1500.50'),
				pressNoticeReference: 'PN-12345',
				pressNoticePlaced: 'Local Gazette'
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.pressNoticeCost, 1500.5);
			assert.strictEqual(result.pressNoticeReference, 'PN-12345');
			assert.strictEqual(result.pressNoticePlaced, 'Local Gazette');
		});

		it('leaves press notice fields undefined when absent', () => {
			const mockDbCase = {
				id: 'case-pn-2',
				reference: 'S62A/2026/0024',
				description: 'Press notice case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.pressNoticeCost, undefined);
			assert.strictEqual(result.pressNoticeReference, undefined);
			assert.strictEqual(result.pressNoticePlaced, undefined);
		});

		it('leaves pressNoticeCost undefined when null in the database record', () => {
			const mockDbCase = {
				id: 'case-pn-3',
				reference: 'S62A/2026/0025',
				description: 'Press notice case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				pressNoticeCost: null,
				pressNoticeReference: '',
				pressNoticePlaced: ''
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.pressNoticeCost, undefined);
			// Depending on whether empty strings map directly or get filtered out,
			// adjust these assertions to match your exact DIRECT_UNMAPPED_FIELDS handling logic:
			assert.strictEqual(result.pressNoticeReference, '');
			assert.strictEqual(result.pressNoticePlaced, '');
		});
	});

	describe('Case Team Mapping', () => {
		const allocated1 = new Date('2026-07-01T09:00:00Z');
		const allocated2 = new Date('2026-07-02T09:00:00Z');
		const appointed1 = new Date('2026-07-01T09:00:00Z');
		const appointed2 = new Date('2026-07-02T09:00:00Z');

		it('maps inspectors from the join rows, surfacing the Entra ID', () => {
			const mockDbCase = {
				id: 'case-team-1',
				reference: 'S62A/2026/0023',
				expectedSubmissionDate: mockDate,
				Inspectors: [
					{
						id: 'inspector-row-1',
						assignedDate: allocated1,
						appointedDate: appointed1,
						User: { id: 'user-guid-1', idpUserId: 'entra-1' }
					},
					{
						id: 'inspector-row-2',
						assignedDate: allocated2,
						appointedDate: appointed2,
						User: { id: 'user-guid-2', idpUserId: 'entra-2' }
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			// the item id is the join row, not the User — the manage list uses it for remove links
			assert.deepStrictEqual(result.manageCaseTeamInspectors, [
				{
					id: 'inspector-row-1',
					inspectorId: 'entra-1',
					inspectorAssignedDate: allocated1,
					inspectorAppointedDate: appointed1
				},
				{
					id: 'inspector-row-2',
					inspectorId: 'entra-2',
					inspectorAssignedDate: allocated2,
					inspectorAppointedDate: appointed2
				}
			]);
		});

		it('maps an inspector with no assigned date', () => {
			const mockDbCase = {
				id: 'case-team-2',
				reference: 'S62A/2026/0024',
				expectedSubmissionDate: mockDate,
				Inspectors: [{ id: 'inspector-row-1', assignedDate: null, User: { idpUserId: 'entra-1' } }]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageCaseTeamInspectors, [
				{
					id: 'inspector-row-1',
					inspectorId: 'entra-1',
					inspectorAssignedDate: undefined,
					inspectorAppointedDate: undefined
				}
			]);
		});

		it('returns an undefined when no inspectors are assigned', () => {
			const mockDbCase = {
				id: 'case-team-3',
				reference: 'S62A/2026/0025',
				expectedSubmissionDate: mockDate,
				Inspectors: []
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageCaseTeamInspectors, undefined);
		});

		it('returns an undefined when the relation is absent from the record', () => {
			const mockDbCase = {
				id: 'case-team-4',
				reference: 'S62A/2026/0026',
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageCaseTeamInspectors, undefined);
		});

		it('maps the four single-user roles to their Entra IDs', () => {
			const mockDbCase = {
				id: 'case-team-5',
				reference: 'S62A/2026/0027',
				expectedSubmissionDate: mockDate,
				CaseOfficer: { id: 'user-guid-1', idpUserId: 'entra-officer' },
				AssessorInspector: { id: 'user-guid-2', idpUserId: 'entra-assessor' },
				PlanningOfficer: { id: 'user-guid-3', idpUserId: 'entra-planning' },
				Reader: { id: 'user-guid-4', idpUserId: 'entra-reader' }
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			// the view model exposes Entra IDs, never the internal User GUID,
			// so the select options (built from Entra group members) match
			assert.strictEqual(result.caseOfficerId, 'entra-officer');
			assert.strictEqual(result.assessorInspectorId, 'entra-assessor');
			assert.strictEqual(result.planningOfficerId, 'entra-planning');
			assert.strictEqual(result.readerId, 'entra-reader');
		});

		it('leaves the roles undefined when the relations are null or absent', () => {
			const mockDbCase = {
				id: 'case-team-6',
				reference: 'S62A/2026/0028',
				expectedSubmissionDate: mockDate,
				CaseOfficer: null,
				AssessorInspector: null
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.caseOfficerId, undefined);
			assert.strictEqual(result.assessorInspectorId, undefined);
			assert.strictEqual(result.planningOfficerId, undefined);
			assert.strictEqual(result.readerId, undefined);
		});
	});

	describe('Pre-Application Mapping', () => {
		const receivedDate = new Date('2026-05-01T09:00:00Z');
		const issuedDate = new Date('2026-06-01T09:00:00Z');

		it('maps the advice lookup id, reference and both dates', () => {
			const mockDbCase = {
				id: 'case-preapp-1',
				reference: 'S62A/2026/0029',
				description: 'Pre-app case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS,
				preApplicationReference: 'PREAPP/123',
				S62aDates: {
					preApplicationReceivedDate: receivedDate,
					preApplicationAdviceIssuedDate: issuedDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.preApplicationAdviceId, PRE_APPLICATION_ADVICE_ID.PINS);
			assert.strictEqual(result.preApplicationReference, 'PREAPP/123');
			assert.strictEqual(result.preApplicationReceivedDate, receivedDate);
			assert.strictEqual(result.preApplicationAdviceIssuedDate, issuedDate);
		});

		it('maps the "No" advice option distinctly from unanswered', () => {
			const withNo = {
				id: 'case-preapp-2',
				reference: 'S62A/2026/0030',
				expectedSubmissionDate: mockDate,
				preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO
			} as unknown as S62aCaseDbModel;

			const withNull = {
				id: 'case-preapp-3',
				reference: 'S62A/2026/0031',
				expectedSubmissionDate: mockDate,
				preApplicationAdviceId: null
			} as unknown as S62aCaseDbModel;

			assert.strictEqual(s62aCaseToViewModel(withNo).preApplicationAdviceId, PRE_APPLICATION_ADVICE_ID.NO);
			assert.strictEqual(s62aCaseToViewModel(withNull).preApplicationAdviceId, undefined);
		});

		it('leaves the reference and dates undefined when null or absent', () => {
			const mockDbCase = {
				id: 'case-preapp-4',
				reference: 'S62A/2026/0032',
				expectedSubmissionDate: mockDate,
				preApplicationReference: null,
				S62aDates: {
					preApplicationReceivedDate: null,
					preApplicationAdviceIssuedDate: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.preApplicationReference, undefined);
			assert.strictEqual(result.preApplicationReceivedDate, undefined);
			assert.strictEqual(result.preApplicationAdviceIssuedDate, undefined);
		});
	});

	describe('Outcome Mapping', () => {
		const decisionDate = new Date('2026-10-01T09:00:00Z');
		const recoveredReportSentDate = new Date('2026-10-15T09:00:00Z');

		it('maps both lookup ids and both dates', () => {
			const mockDbCase = {
				id: 'case-outcome-1',
				reference: 'S62A/2026/0033',
				description: 'Outcome case',
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedSubmissionDate: mockDate,
				outcomeTypeId: OUTCOME_TYPE_ID.DECISION,
				decisionOutcomeId: DECISION_OUTCOME_ID.GRANTED_WITH_CONDITIONS,
				S62aDates: {
					decisionDate,
					recoveredReportSentDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.outcomeTypeId, OUTCOME_TYPE_ID.DECISION);
			assert.strictEqual(result.decisionOutcomeId, DECISION_OUTCOME_ID.GRANTED_WITH_CONDITIONS);
			assert.strictEqual(result.decisionDate, decisionDate);
			assert.strictEqual(result.recoveredReportSentDate, recoveredReportSentDate);
		});

		it('maps a recommendation outcome with its recovered report date', () => {
			const mockDbCase = {
				id: 'case-outcome-2',
				reference: 'S62A/2026/0034',
				expectedSubmissionDate: mockDate,
				outcomeTypeId: OUTCOME_TYPE_ID.RECOMMENDATION,
				decisionOutcomeId: null,
				S62aDates: { recoveredReportSentDate }
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.outcomeTypeId, OUTCOME_TYPE_ID.RECOMMENDATION);
			assert.strictEqual(result.decisionOutcomeId, undefined);
			assert.strictEqual(result.recoveredReportSentDate, recoveredReportSentDate);
		});

		it('maps the "Refused" outcome, which must not be confused with an unanswered field', () => {
			const withRefused = {
				id: 'case-outcome-3',
				reference: 'S62A/2026/0035',
				expectedSubmissionDate: mockDate,
				decisionOutcomeId: DECISION_OUTCOME_ID.REFUSED
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(withRefused);

			assert.strictEqual(result.decisionOutcomeId, DECISION_OUTCOME_ID.REFUSED);
		});

		it('leaves the lookups and dates undefined when null or absent', () => {
			const mockDbCase = {
				id: 'case-outcome-4',
				reference: 'S62A/2026/0036',
				expectedSubmissionDate: mockDate,
				outcomeTypeId: null,
				decisionOutcomeId: null,
				S62aDates: {
					decisionDate: null,
					recoveredReportSentDate: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.outcomeTypeId, undefined);
			assert.strictEqual(result.decisionOutcomeId, undefined);
			assert.strictEqual(result.decisionDate, undefined);
			assert.strictEqual(result.recoveredReportSentDate, undefined);
		});

		it('does not confuse recoveredReportSentDate with the existing recoveredDate', () => {
			const recoveredDate = new Date('2026-09-01T09:00:00Z');
			const mockDbCase = {
				id: 'case-outcome-5',
				reference: 'S62A/2026/0037',
				expectedSubmissionDate: mockDate,
				S62aDates: { recoveredDate, recoveredReportSentDate }
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.recoveredDate, recoveredDate);
			assert.strictEqual(result.recoveredReportSentDate, recoveredReportSentDate);
		});
	});

	describe('Event Mapping', () => {
		const procedureNotificationDate = new Date('2026-08-01T09:00:00Z');
		const hearingDate = new Date('2026-09-01T09:00:00Z');
		const notificationDate = new Date('2026-08-15T09:00:00Z');
		const additionalMeetingDate = new Date('2026-09-10T09:00:00Z');
		const issuesReportingPublishedDate = new Date('2026-08-20T09:00:00Z');
		const siteVisitDate = new Date('2026-09-05T09:00:00Z');

		it('does not map event fields if S62aEvent is missing', () => {
			const mockDbCase = {
				id: 'case-event-1',
				reference: 'S62A/2026/0038',
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.venue, undefined);
			assert.strictEqual(result.prepDuration, undefined);
			assert.strictEqual(result.siteVisitDate, undefined);
		});

		it('maps every event date field to the root of the view model', () => {
			const mockDbCase = {
				id: 'case-event-2',
				reference: 'S62A/2026/0039',
				expectedSubmissionDate: mockDate,
				S62aEvent: {
					procedureNotificationDate,
					hearingDate,
					notificationDate,
					additionalMeetingDate,
					issuesReportingPublishedDate,
					siteVisitDate
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.procedureNotificationDate, procedureNotificationDate);
			assert.strictEqual(result.hearingDate, hearingDate);
			assert.strictEqual(result.notificationDate, notificationDate);
			assert.strictEqual(result.additionalMeetingDate, additionalMeetingDate);
			assert.strictEqual(result.issuesReportingPublishedDate, issuesReportingPublishedDate);
			assert.strictEqual(result.siteVisitDate, siteVisitDate);
		});

		it('converts the three duration decimals to plain numbers', () => {
			const mockDbCase = {
				id: 'case-event-3',
				reference: 'S62A/2026/0040',
				expectedSubmissionDate: mockDate,
				S62aEvent: {
					prepDuration: createMockDecimal(2),
					sittingDuration: createMockDecimal(3.5),
					reportingDuration: createMockDecimal(1)
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.prepDuration, 2);
			assert.strictEqual(result.sittingDuration, 3.5);
			assert.strictEqual(result.reportingDuration, 1);
		});

		it('maps the venue and site visit type', () => {
			const mockDbCase = {
				id: 'case-event-4',
				reference: 'S62A/2026/0041',
				expectedSubmissionDate: mockDate,
				S62aEvent: {
					venue: 'Council Chamber, Town Hall',
					siteVisitTypeId: SITE_VISIT_TYPE_ID.ACCESS_REQUIRED
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.venue, 'Council Chamber, Town Hall');
			assert.strictEqual(result.siteVisitTypeId, SITE_VISIT_TYPE_ID.ACCESS_REQUIRED);
		});

		it('leaves event fields undefined when null on the record', () => {
			const mockDbCase = {
				id: 'case-event-5',
				reference: 'S62A/2026/0042',
				expectedSubmissionDate: mockDate,
				S62aEvent: {
					hearingDate: null,
					venue: null,
					prepDuration: null,
					siteVisitTypeId: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.venue, undefined);
			assert.strictEqual(result.prepDuration, undefined);
			assert.strictEqual(result.siteVisitTypeId, undefined);
		});

		it('does not confuse the event notificationDate with notificationReceivedDate on S62aDates', () => {
			const notificationReceivedDate = new Date('2026-07-01T09:00:00Z');
			const mockDbCase = {
				id: 'case-event-6',
				reference: 'S62A/2026/0043',
				expectedSubmissionDate: mockDate,
				S62aDates: { notificationReceivedDate },
				S62aEvent: { notificationDate }
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.notificationReceivedDate, notificationReceivedDate);
			assert.strictEqual(result.notificationDate, notificationDate);
		});
	});

	describe('Waste Mapping', () => {
		it('maps the description and the boolean', () => {
			const mockDbCase = {
				id: 'case-waste-1',
				reference: 'S62A/2026/0044',
				expectedSubmissionDate: mockDate,
				wasteActivitiesDescription: 'Sorting and baling',
				isWasteManagementDevelopment: true
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.wasteActivitiesDescription, 'Sorting and baling');
			assert.strictEqual(result.isWasteManagementDevelopment, 'yes');
		});

		it('maps "No" distinctly from unanswered', () => {
			const withNo = {
				id: 'case-waste-2',
				reference: 'S62A/2026/0045',
				expectedSubmissionDate: mockDate,
				isWasteManagementDevelopment: false
			} as unknown as S62aCaseDbModel;

			const withNull = {
				id: 'case-waste-3',
				reference: 'S62A/2026/0046',
				expectedSubmissionDate: mockDate,
				isWasteManagementDevelopment: null
			} as unknown as S62aCaseDbModel;

			assert.strictEqual(s62aCaseToViewModel(withNo).isWasteManagementDevelopment, 'no');
			assert.strictEqual(s62aCaseToViewModel(withNull).isWasteManagementDevelopment, undefined);
		});

		it('maps waste types, converting the decimals and expanding the conditional keys', () => {
			const mockDbCase = {
				id: 'case-waste-4',
				reference: 'S62A/2026/0047',
				expectedSubmissionDate: mockDate,
				WasteTypes: [
					{
						id: 'row-1',
						wasteTypeId: WASTE_TYPE_ID.INERT_LANDFILL,
						voidCapacity: createMockDecimal(34),
						voidCapacityUnitId: WASTE_UNIT_ID.CUBIC_METRES,
						maxAnnualThroughput: createMockDecimal(55),
						maxAnnualThroughputUnitId: WASTE_UNIT_ID.TONNES
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.deepStrictEqual(result.manageWasteTypes, [
				{
					id: 'row-1',
					wasteTypeId: WASTE_TYPE_ID.INERT_LANDFILL,
					voidCapacity: 34,
					voidCapacityUnitId: WASTE_UNIT_ID.CUBIC_METRES,
					maxAnnualThroughput: 55,
					maxAnnualThroughputUnitId: WASTE_UNIT_ID.TONNES,
					// the conditional radio reads the amount from this key, so the
					// right input pre-fills on edit and the table can find the value
					[`voidCapacityUnitId_${WASTE_UNIT_ID.CUBIC_METRES}`]: '34',
					[`maxAnnualThroughputUnitId_${WASTE_UNIT_ID.TONNES}`]: '55'
				}
			]);
		});

		it('omits the conditional keys when there is no amount', () => {
			const mockDbCase = {
				id: 'case-waste-5',
				reference: 'S62A/2026/0048',
				expectedSubmissionDate: mockDate,
				WasteTypes: [
					{
						id: 'row-1',
						wasteTypeId: WASTE_TYPE_ID.MUNICIPAL,
						voidCapacity: null,
						voidCapacityUnitId: null,
						maxAnnualThroughput: createMockDecimal(43),
						maxAnnualThroughputUnitId: WASTE_UNIT_ID.LITRES
					}
				]
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);
			const [item] = result.manageWasteTypes!;

			assert.strictEqual(item.voidCapacity, undefined);
			assert.strictEqual(item.voidCapacityUnitId, undefined);
			assert.strictEqual(item[`maxAnnualThroughputUnitId_${WASTE_UNIT_ID.LITRES}`], '43');
		});

		it('returns an empty array when there are no waste types', () => {
			const withEmpty = {
				id: 'case-waste-6',
				reference: 'S62A/2026/0049',
				expectedSubmissionDate: mockDate,
				WasteTypes: []
			} as unknown as S62aCaseDbModel;

			const withNone = {
				id: 'case-waste-7',
				reference: 'S62A/2026/0050',
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			assert.deepStrictEqual(s62aCaseToViewModel(withEmpty).manageWasteTypes, []);
			assert.deepStrictEqual(s62aCaseToViewModel(withNone).manageWasteTypes, []);
		});
	});

	describe('Residential Mapping', () => {
		it('maps the three booleans to YesNo values', () => {
			const mockDbCase = {
				id: 'case-res-1',
				reference: 'S62A/2026/0051',
				expectedSubmissionDate: mockDate,
				S62aResidential: {
					hasResidentialUnitsChange: true,
					hasExistingHousing: false,
					hasProposedHousing: true
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hasResidentialUnitsChange, 'yes');
			assert.strictEqual(result.hasExistingHousing, 'no');
			assert.strictEqual(result.hasProposedHousing, 'yes');
		});

		it('leaves the booleans undefined when null', () => {
			const mockDbCase = {
				id: 'case-res-2',
				reference: 'S62A/2026/0052',
				expectedSubmissionDate: mockDate,
				S62aResidential: {
					hasResidentialUnitsChange: null,
					hasExistingHousing: null,
					hasProposedHousing: null
				}
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hasResidentialUnitsChange, undefined);
			assert.strictEqual(result.hasExistingHousing, undefined);
			assert.strictEqual(result.hasProposedHousing, undefined);
		});

		it('does not map residential fields if S62aResidential is missing', () => {
			const mockDbCase = {
				id: 'case-res-3',
				reference: 'S62A/2026/0053',
				expectedSubmissionDate: mockDate
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.hasResidentialUnitsChange, undefined);
		});

		it('leaves the housing placeholders unset so their rows show an Add link', () => {
			const mockDbCase = {
				id: 'case-res-4',
				reference: 'S62A/2026/0054',
				expectedSubmissionDate: mockDate,
				S62aResidential: { hasResidentialUnitsChange: true }
			} as unknown as S62aCaseDbModel;

			const result = s62aCaseToViewModel(mockDbCase);

			assert.strictEqual(result.manageExistingHousing, undefined);
			assert.strictEqual(result.manageProposedHousing, undefined);
		});
	});
});

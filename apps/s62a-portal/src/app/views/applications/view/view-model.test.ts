import assert from 'assert';
import { describe, it } from 'node:test';
import { APPLICATION_PUBLISH_STATUS } from '@pins/crowndev-lib/util/applications.ts';
import { APPLICATION_PROCEDURE_ID, ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { APPLICANT_TYPE_ID, OUTCOME_TYPE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { s62aCaseToRawViewModel, s62aCaseToViewModel, type S62aCaseWithRelations } from './view-model.ts';

describe('s62aCaseToViewModel', () => {
	it('should map base fields correctly', () => {
		const mockCase = {
			id: 's62a-1',
			reference: 'REF-001',
			description: 'A test description',
			Type: { displayName: 'Standard' },
			Lpa: { name: 'Test LPA' }
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.id, 's62a-1');
		assert.strictEqual(result.reference, 'REF-001');
		assert.strictEqual(result.description, 'A test description');
		assert.strictEqual(result.applicationType, 'Standard');
		assert.strictEqual(result.lpaName, 'Test LPA');
		assert.deepStrictEqual(result.applicants, []);
		assert.strictEqual(result.applicationStatus, undefined);
		assert.strictEqual(result.showHearing, false);
		assert.strictEqual(result.hearingDate, undefined);
		assert.strictEqual(result.hearingVenue, undefined);
		assert.strictEqual(result.showDecision, false);
		assert.strictEqual(result.decisionOutcome, undefined);
		assert.strictEqual(result.isMajor, false);
		assert.deepStrictEqual(result.documents, []);
	});

	it('should not set applicationStatus if withdrawnDate is not present in S62aDates', () => {
		const mockCase = {
			id: 's62a-2',
			reference: 'REF-002',
			S62aDates: {
				publishDate: new Date('2025-01-01T00:00:00Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.id, 's62a-2');
		assert.strictEqual(result.applicationStatus, undefined);
	});

	it('should set applicationStatus to ACTIVE when withdrawnDate is null', () => {
		const mockCase = {
			id: 's62a-3',
			reference: 'REF-003',
			S62aDates: {
				withdrawnDate: null
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.ACTIVE);
	});

	it('should set applicationStatus based on withdrawnDate when it is in the past', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-02-23T00:00:00.000Z') });

		const mockCase = {
			id: 's62a-4',
			reference: 'REF-004',
			S62aDates: {
				withdrawnDate: new Date('2024-02-22T23:59:59.000Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.EXPIRED);
	});

	it('should set applicationStatus based on withdrawnDate when it is less than a year ago', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-02-23T00:00:00.000Z') });

		const mockCase = {
			id: 's62a-5',
			reference: 'REF-005',
			S62aDates: {
				withdrawnDate: new Date('2025-02-22T00:00:00.000Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.WITHDRAWN);
	});

	it('should map individual applicants correctly', () => {
		const mockCase = {
			ApplicantType: { id: APPLICANT_TYPE_ID.INDIVIDUAL },
			S62aToApplicants: [
				{
					roleId: ORGANISATION_ROLES_ID.APPLICANT,
					Contact: { firstName: 'Jane', lastName: 'Doe' }
				},
				{
					roleId: 'different-role',
					Contact: { firstName: 'Ignored', lastName: 'Person' }
				}
			]
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.deepStrictEqual(result.applicants, ['Jane Doe']);
	});

	it('should map organisation applicants correctly', () => {
		const mockCase = {
			ApplicantType: { id: 'some-other-type' },
			S62aToApplicants: [
				{
					roleId: ORGANISATION_ROLES_ID.APPLICANT,
					Organisation: { name: 'Acme Corp' }
				}
			]
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.deepStrictEqual(result.applicants, ['Acme Corp']);
	});

	it('should map optional conditional fields when they are provided', () => {
		const mockCase = {
			SecondaryLpa: { name: 'Secondary Test LPA' },
			SiteAddress: {
				postcode: 'BS1 6PN',
				line1: '2 Temple Back East',
				townCity: 'Bristol'
			},
			siteEasting: 123,
			siteNorthing: 4567,
			Procedure: { displayName: 'Written Representations' }
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.secondaryLpaName, 'Secondary Test LPA');
		assert.strictEqual(result.procedure, 'Written Representations');

		assert.strictEqual(typeof result.siteAddress, 'string');
		assert.ok(result.siteAddress?.includes('BS1 6PN'));

		assert.deepStrictEqual(result.siteCoordinates, {
			easting: '000123',
			northing: '004567'
		});
	});

	it('should correctly pad site coordinates to 6 characters', () => {
		const mockCase = {
			siteEasting: 12,
			siteNorthing: 1234567
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.deepStrictEqual(result.siteCoordinates, {
			easting: '000012',
			northing: '1234567'
		});
	});

	it('should format standard case dates correctly', () => {
		const mockCase = {
			S62aDates: {
				applicationValidDate: new Date('2024-01-15T12:00:00Z'),
				targetDecisionDate: new Date('2024-03-15T12:00:00Z'),
				extendedTargetDecisionDate: new Date('2024-04-15T12:00:00Z'),
				decisionDate: new Date('2024-02-15T12:00:00Z'),
				withdrawnDate: new Date('2024-05-15T12:00:00Z')
			},
			representationsPublishDate: new Date('2024-06-15T12:00:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationValidDate, '15 January 2024');
		assert.strictEqual(result.targetDecisionDate, '15 March 2024');
		assert.strictEqual(result.extendedTargetDecisionDate, '15 April 2024');
		assert.strictEqual(result.decisionDate, '15 February 2024');
		assert.strictEqual(result.withdrawnDate, '15 May 2024');
		assert.strictEqual(result.representationsPublishDate, '15 June 2024');
	});

	it('should return all dates unformatted in the raw view model', () => {
		const dates = {
			applicationValidDate: new Date('2024-01-15T12:00:00Z'),
			targetDecisionDate: new Date('2024-03-15T12:00:00Z'),
			extendedTargetDecisionDate: new Date('2024-04-15T12:00:00Z'),
			decisionDate: new Date('2024-02-15T12:00:00Z'),
			withdrawnDate: new Date('2024-05-15T12:00:00Z')
		};
		const representationsPeriodStartDate = new Date('2024-01-01T09:30:00Z');
		const representationsPeriodEndDate = new Date('2024-01-31T17:45:00Z');
		const hearingDate = new Date('2024-06-20T13:30:00Z');
		const representationsPublishDate = new Date('2024-02-01T00:00:00Z');
		const documentPublishDate = new Date('2025-10-22T10:00:00Z');
		const mockCase = {
			S62aDates: dates,
			representationsPeriodStartDate,
			representationsPeriodEndDate,
			representationsPublishDate,
			procedureId: APPLICATION_PROCEDURE_ID.HEARING,
			S62aEvent: { hearingDate },
			Documents: [{ fileName: 'document.pdf', size: 0, publishDate: documentPublishDate }]
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToRawViewModel(mockCase);

		assert.strictEqual(result.applicationValidDate, dates.applicationValidDate);
		assert.strictEqual(result.targetDecisionDate, dates.targetDecisionDate);
		assert.strictEqual(result.extendedTargetDecisionDate, dates.extendedTargetDecisionDate);
		assert.strictEqual(result.decisionDate, dates.decisionDate);
		assert.strictEqual(result.withdrawnDate, dates.withdrawnDate);
		assert.strictEqual(result.representationsPeriodStartDateTime, representationsPeriodStartDate);
		assert.strictEqual(result.representationsPeriodEndDateTime, representationsPeriodEndDate);
		assert.strictEqual(result.hearingDate, hearingDate);
		assert.strictEqual(result.representationsPublishDate, representationsPublishDate);
		assert.strictEqual(result.documents[0].date, documentPublishDate);
	});

	it('should format representation period dates when both are provided', () => {
		const mockCase = {
			representationsPeriodStartDate: new Date('2024-01-01T09:30:00Z'),
			representationsPeriodEndDate: new Date('2024-01-31T17:45:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.representationsPeriodStartDateTime, '1 January 2024 at 9:30am');
		assert.strictEqual(result.representationsPeriodEndDateTime, '31 January 2024 at 5:45pm');
	});

	it('should not format representation period dates if start date is missing', () => {
		const mockCase = {
			representationsPeriodEndDate: new Date('2024-01-31T17:45:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.representationsPeriodStartDateTime, undefined);
		assert.strictEqual(result.representationsPeriodEndDateTime, undefined);
	});

	it('should not format representation period dates if end date is missing', () => {
		const mockCase = {
			representationsPeriodStartDate: new Date('2024-01-01T09:30:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.representationsPeriodStartDateTime, undefined);
		assert.strictEqual(result.representationsPeriodEndDateTime, undefined);
	});

	it('should format and show hearing information when procedure is HEARING and details are present', () => {
		const mockCase = {
			procedureId: APPLICATION_PROCEDURE_ID.HEARING,
			S62aEvent: {
				hearingDate: new Date('2024-06-20T13:30:00Z'),
				venue: 'Bristol City Hall'
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showHearing, true);
		assert.strictEqual(result.hearingDate, '20 June 2024 at 2:30pm');
		assert.strictEqual(result.hearingVenue, 'Bristol City Hall');
	});

	it('should set showHearing to true if procedure is HEARING and only venue is present', () => {
		const mockCase = {
			procedureId: APPLICATION_PROCEDURE_ID.HEARING,
			S62aEvent: {
				venue: 'Bristol City Hall'
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showHearing, true);
		assert.strictEqual(result.hearingDate, undefined);
		assert.strictEqual(result.hearingVenue, 'Bristol City Hall');
	});

	it('should not show hearing information if procedure is NOT hearing, even if details are present', () => {
		const mockCase = {
			procedureId: 'some-other-procedure-id',
			S62aEvent: {
				hearingDate: new Date('2024-06-20T13:30:00Z'),
				venue: 'Bristol City Hall'
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showHearing, false);
		assert.strictEqual(result.hearingDate, undefined);
		assert.strictEqual(result.hearingVenue, undefined);
	});

	it('should not show hearing if procedure is HEARING but no date or venue is provided', () => {
		const mockCase = {
			procedureId: APPLICATION_PROCEDURE_ID.HEARING,
			S62aEvent: {}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showHearing, false);
		assert.strictEqual(result.hearingDate, undefined);
		assert.strictEqual(result.hearingVenue, undefined);
	});

	it('should set showDecision to true and format outcome when outcomeTypeId is DECISION and decisionDate is present', () => {
		const mockCase = {
			outcomeTypeId: OUTCOME_TYPE_ID.DECISION,
			S62aDates: {
				decisionDate: new Date('2024-08-15T12:00:00Z')
			},
			DecisionOutcome: {
				displayName: 'Approved with conditions'
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showDecision, true);
		assert.strictEqual(result.decisionOutcome, 'Approved with conditions');
	});

	it('should set showDecision to false if outcomeTypeId is DECISION but decisionDate is missing', () => {
		const mockCase = {
			outcomeTypeId: OUTCOME_TYPE_ID.DECISION,
			S62aDates: {},
			DecisionOutcome: {
				displayName: 'Refused'
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showDecision, false);
		assert.strictEqual(result.decisionOutcome, 'Refused');
	});

	it('should set showDecision to false if decisionDate is present but outcomeTypeId is NOT DECISION', () => {
		const mockCase = {
			outcomeTypeId: 'some-other-outcome',
			S62aDates: {
				decisionDate: new Date('2024-08-15T12:00:00Z')
			},
			DecisionOutcome: {
				displayName: 'Withdrawn'
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showDecision, false);
		assert.strictEqual(result.decisionOutcome, 'Withdrawn');
	});

	it('should handle missing DecisionOutcome relationship safely', () => {
		const mockCase = {
			outcomeTypeId: OUTCOME_TYPE_ID.DECISION,
			S62aDates: {
				decisionDate: new Date('2024-08-15T12:00:00Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.showDecision, true);
		assert.strictEqual(result.decisionOutcome, undefined);
	});

	it('should handle documents relationship safely when not provided', () => {
		const mockCase = {} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.deepStrictEqual(result.documents, []);
	});

	it('should map documents correctly, including file extensions, sizes and formatted dates', () => {
		const mockCase = {
			Documents: [
				{
					id: 'doc-1',
					fileName: 'site-plan.pdf',
					size: 1048576,
					publishDate: new Date('2025-10-22T10:00:00Z'),
					s62aCaseId: 's62a-123',
					categoryId: 'cat-1',
					DocumentCategory: {
						displayName: 'Application Documents'
					}
				},
				{
					id: 'doc-2',
					fileName: 'drawing.PNG',
					size: 2048,
					publishDate: new Date('2025-12-05T15:30:00Z'),
					s62aCaseId: 's62a-123',
					categoryId: 'cat-2',
					DocumentCategory: {
						displayName: 'Plans'
					}
				},
				{
					id: 'doc-3',
					fileName: 'unknown_file_type',
					size: 1234,
					publishDate: new Date('2025-01-01T12:00:00Z'),
					s62aCaseId: 's62a-123',
					categoryId: 'cat-3',
					DocumentCategory: null
				}
			]
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.documents.length, 3);

		assert.strictEqual(result.documents[0].id, 'doc-1');
		assert.strictEqual(result.documents[0].fileName, 'site-plan.pdf');
		assert.strictEqual(result.documents[0].fileType, 'PDF');
		assert.strictEqual(typeof result.documents[0].size, 'string');
		assert.strictEqual(result.documents[0].date, '22 Oct 2025');
		assert.strictEqual(result.documents[0].caseId, 's62a-123');
		assert.strictEqual(result.documents[0].category, 'Application Documents');
		assert.strictEqual(result.documents[0].categoryId, 'cat-1');

		assert.strictEqual(result.documents[1].id, 'doc-2');
		assert.strictEqual(result.documents[1].fileName, 'drawing.PNG');
		assert.strictEqual(result.documents[1].fileType, 'PNG');
		assert.strictEqual(result.documents[1].date, '05 Dec 2025');

		assert.strictEqual(result.documents[2].id, 'doc-3');
		assert.strictEqual(result.documents[2].fileName, 'unknown_file_type');
		assert.strictEqual(result.documents[2].fileType, 'UNKNOWN_FILE_TYPE');
		assert.strictEqual(result.documents[2].category, '');
	});
});

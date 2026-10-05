import assert from 'assert';
import { describe, it } from 'node:test';
import { APPLICATION_PUBLISH_STATUS } from '@pins/crowndev-lib/util/applications.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { APPLICANT_TYPE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from './view-model.ts';

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
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationValidDate, '15 January 2024');
		assert.strictEqual(result.targetDecisionDate, '15 March 2024');
		assert.strictEqual(result.extendedTargetDecisionDate, '15 April 2024');
		assert.strictEqual(result.decisionDate, '15 February 2024');
		assert.strictEqual(result.withdrawnDate, '15 May 2024');
	});

	it('should format representation period dates when both are provided', () => {
		const mockCase = {
			representationsPeriodStartDate: new Date('2024-01-01T09:30:00Z'),
			representationsPeriodEndDate: new Date('2024-01-31T17:45:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.representationPeriodStartDateTime, '1 January 2024 at 9:30am');
		assert.strictEqual(result.representationPeriodEndDateTime, '31 January 2024 at 5:45pm');
	});

	it('should not format representation period dates if start date is missing', () => {
		const mockCase = {
			representationsPeriodEndDate: new Date('2024-01-31T17:45:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.representationPeriodStartDateTime, undefined);
		assert.strictEqual(result.representationPeriodEndDateTime, undefined);
	});

	it('should not format representation period dates if end date is missing', () => {
		const mockCase = {
			representationsPeriodStartDate: new Date('2024-01-01T09:30:00Z')
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.representationPeriodStartDateTime, undefined);
		assert.strictEqual(result.representationPeriodEndDateTime, undefined);
	});
});

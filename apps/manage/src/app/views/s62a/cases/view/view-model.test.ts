import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SITE_AREA_UNIT_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { s62aCaseToViewModel, type S62aCaseDbModel } from './view-model.ts';

const mockDate = new Date('2026-07-14T12:00:00Z');

const createMockDecimal = (value: number) => ({
	toNumber: () => value,
	dividedBy: (divisor: number) => ({
		toFixed: (decimals: number) => (value / divisor).toFixed(decimals)
	})
});

describe('s62aCaseToViewModel', () => {
	it('maps a full database record to the view model correctly', () => {
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

		assert.deepStrictEqual(result, {
			id: 'case-123',
			reference: 'S62A/2026/0001',
			developmentDescription: 'A massive new development',
			typeId: 'type-123',
			lpaId: 'lpa-123',
			hasSecondaryLpa: 'no',
			expectedSubmissionDate: mockDate,
			siteIsVisibleFromPublicLand: 'yes',
			s62aStatusId: 'status-new',
			applicationPhaseId: 'phase-1',
			classificationId: undefined,
			secondaryLpaId: undefined,
			specialismId: undefined,
			inspectorBandId: undefined,
			subTypeId: undefined,
			likelyIssues: 'Traffic and noise',
			siteNorthing: 123456,
			siteEasting: 654321
		});
	});

	it('maps dynamic relation and optional boolean fields as undefined when they are null in the database', () => {
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
			siteIsVisibleFromPublicLand: null
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.deepStrictEqual(result, {
			id: 'case-456',
			reference: 'S62A/2026/0002',
			developmentDescription: 'Another development',
			typeId: 'type-456',
			lpaId: null,
			hasSecondaryLpa: 'yes',
			expectedSubmissionDate: mockDate,
			siteIsVisibleFromPublicLand: undefined,
			s62aStatusId: undefined,
			applicationPhaseId: undefined,
			classificationId: undefined,
			secondaryLpaId: undefined,
			specialismId: undefined,
			inspectorBandId: undefined,
			subTypeId: undefined,
			likelyIssues: undefined,
			siteNorthing: undefined,
			siteEasting: undefined
		});
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
});

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
});

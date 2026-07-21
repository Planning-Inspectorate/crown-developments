import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { SITE_AREA_UNIT_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import { S62aCaseUpdateMapper, type UpdateCaseAnswers } from './s62a-update-case-mapper.ts';
import type { Address } from '@planning-inspectorate/dynamic-forms';
import { addBusinessDays } from 'date-fns';

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
			const answers: UpdateCaseAnswers = {
				developmentDescription: 'Updated description',
				likelyIssues: 'Traffic',
				expectedSubmissionDate: date,
				hasSecondaryLpa: 'yes'
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.description, 'Updated description');
			assert.strictEqual(result.likelyIssues, 'Traffic');
			assert.strictEqual(result.expectedSubmissionDate, date);
			assert.strictEqual(result.hasSecondaryLpa, true);
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
});

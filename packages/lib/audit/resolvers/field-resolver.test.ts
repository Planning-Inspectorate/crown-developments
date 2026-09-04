import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFieldValues } from './field-resolver.ts';

describe('Field Resolver', () => {
	// Set environment before importing modules that depend on it
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	describe('getFieldDisplayName', () => {
		const FIELD_DISPLAY_NAMES: Record<string, string> = {
			siteArea: 'Site area (ha)',
			lpaReference: 'LPA reference'
		};

		it('should return display name from FIELD_DISPLAY_NAMES for known fields', async () => {
			const { getFieldDisplayName } = await import('./field-resolver.ts');
			assert.strictEqual(getFieldDisplayName('siteArea', FIELD_DISPLAY_NAMES), 'Site area (ha)');
			assert.strictEqual(getFieldDisplayName('lpaReference', FIELD_DISPLAY_NAMES), 'LPA reference');
		});

		it('should fall back to sentence case for unknown fields', async () => {
			const { getFieldDisplayName } = await import('./field-resolver.ts');
			assert.strictEqual(getFieldDisplayName('unknownFieldName', FIELD_DISPLAY_NAMES), 'Unknown field name');
			assert.strictEqual(getFieldDisplayName('someOtherField', FIELD_DISPLAY_NAMES), 'Some other field');
		});
	});

	describe('resolveFieldValues', () => {
		describe('simple scalar values', () => {
			it('should resolve simple scalar field values', async () => {
				const previousCase = { siteArea: 10.5 };
				const newAnswer = 15.0;

				const { oldValue, newValue } = resolveFieldValues('siteArea', previousCase, newAnswer);

				assert.strictEqual(oldValue, '10.5');
				assert.strictEqual(newValue, '15');
			});

			it('should return "-" for null previous value', async () => {
				const previousCase = { siteArea: null };
				const newAnswer = 12.5;

				const { oldValue, newValue } = resolveFieldValues('siteArea', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '12.5');
			});

			it('should return "-" for null new value', async () => {
				const previousCase = { siteArea: 10.5 };
				const newAnswer = null;

				const { oldValue, newValue } = resolveFieldValues('siteArea', previousCase, newAnswer);

				assert.strictEqual(oldValue, '10.5');
				assert.strictEqual(newValue, '-');
			});

			it('should return "-" for undefined previous value', async () => {
				const previousCase = {};
				const newAnswer = 'New Value';

				const { oldValue, newValue } = resolveFieldValues('lpaReference', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, 'New Value');
			});

			it('should handle string values', async () => {
				const previousCase = { lpaReference: 'ABC/123' };
				const newAnswer = 'XYZ/456';

				const { oldValue, newValue } = resolveFieldValues('lpaReference', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'ABC/123');
				assert.strictEqual(newValue, 'XYZ/456');
			});
		});

		describe('composite values', () => {
			it('should use address resolver for address fields', async () => {
				const previousCase = {
					siteAddress: {
						line1: '123 Old Street',
						townCity: 'London',
						postcode: 'SW1A 1AA'
					}
				};
				const newAnswer = {
					addressLine1: '456 New Road',
					townCity: 'Manchester',
					postcode: 'M1 1AA'
				};

				const { oldValue, newValue } = resolveFieldValues('siteAddress', previousCase, newAnswer);

				assert.strictEqual(oldValue, '123 Old Street, London, SW1A 1AA');
				assert.strictEqual(newValue, '456 New Road, Manchester, M1 1AA');
			});

			it('should return "-" for null address', async () => {
				const previousCase = { siteAddress: null };
				const newAnswer = null;

				const { oldValue, newValue } = resolveFieldValues('siteAddress', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '-');
			});
		});

		describe('ID field resolvers', () => {
			it('should resolve typeId to application type display names', async () => {
				const previousCase = { typeId: 'planning-permission' };
				const newAnswer = 'outline-planning-permission-some-reserved';

				const { oldValue, newValue } = resolveFieldValues('typeId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'Planning permission');
				assert.strictEqual(newValue, 'Outline planning permission with some matters reserved');
			});

			it('should resolve statusId to application status display names', async () => {
				const previousCase = { statusId: 'new' };
				const newAnswer = 'acceptance';

				const { oldValue, newValue } = resolveFieldValues('statusId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'New');
				assert.strictEqual(newValue, 'Accepted');
			});

			it('should resolve stageId to application stage display names', async () => {
				const previousCase = { stageId: 'acceptance' };
				const newAnswer = 'consultation';

				const { oldValue, newValue } = resolveFieldValues('stageId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'Accepted');
				assert.strictEqual(newValue, 'Consultation');
			});

			it('should resolve procedureId to procedure display names', async () => {
				const previousCase = { procedureId: 'written-reps' };
				const newAnswer = 'inquiry';

				const { oldValue, newValue } = resolveFieldValues('procedureId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'Written representations');
				assert.strictEqual(newValue, 'Inquiry');
			});

			it('should resolve decisionOutcomeId to decision outcome display names', async () => {
				const previousCase = { decisionOutcomeId: null };
				const newAnswer = 'approved';

				const { oldValue, newValue } = resolveFieldValues('decisionOutcomeId', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, 'Approved');
			});

			it('should resolve subCategoryId to category display names', async () => {
				const previousCase = { subCategoryId: 'major-minerals' };
				const newAnswer = 'non-major-buildings-under-1000-sqm';

				const { oldValue, newValue } = resolveFieldValues('subCategoryId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'Major Development > Minerals');
				assert.strictEqual(newValue, 'Non-Major Development > Buildings less than 1000 square metres');
			});

			it('should display "[Unknown value]" for unknown reference values', async () => {
				const previousCase = { typeId: 'unknown-type-id' };
				const newAnswer = 'another-unknown-type';

				const { oldValue, newValue } = resolveFieldValues('typeId', previousCase, newAnswer);

				assert.strictEqual(oldValue, '[Unknown value]');
				assert.strictEqual(newValue, '[Unknown value]');
			});

			it('should resolve lpaId using static LPA data lookup', async () => {
				// Both old and new values are looked up from static LPA data using the ID
				const previousCase = {
					lpaId: '4515ebac-65e2-4bcd-bc0b-a6fee69ae25a' // System Test Borough Council
				};
				const newAnswer = '1a76f67e-5828-4532-bd6f-aa7ef40a13ca'; // Another System Test Borough Council

				const { oldValue, newValue } = resolveFieldValues('lpaId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'System Test Borough Council');
				assert.strictEqual(newValue, 'Another System Test Borough Council');
			});

			it('should return "-" for null lpaId values', async () => {
				const previousCase = { lpaId: null };
				const newAnswer = null;

				const { oldValue, newValue } = resolveFieldValues('lpaId', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '-');
			});

			it('should resolve secondaryLpaId using static LPA data lookup', async () => {
				const previousCase = {
					secondaryLpaId: '4515ebac-65e2-4bcd-bc0b-a6fee69ae25a' // System Test Borough Council
				};
				const newAnswer = null; // Removing secondary LPA

				const { oldValue, newValue } = resolveFieldValues('secondaryLpaId', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'System Test Borough Council');
				assert.strictEqual(newValue, '-');
			});
		});

		describe('boolean field resolvers', () => {
			it('should format previous yes/no string and new boolean value for hasAgent', () => {
				const previousCase = { hasAgent: 'yes' };
				const newAnswer = false;

				const { oldValue, newValue } = resolveFieldValues('hasAgent', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'Yes');
				assert.strictEqual(newValue, 'No');
			});

			it('should format previous no string and new true boolean', () => {
				const previousCase = { nationallyImportant: 'no' };
				const newAnswer = true;

				const { oldValue, newValue } = resolveFieldValues('nationallyImportant', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'No');
				assert.strictEqual(newValue, 'Yes');
			});

			it('should return "-" for null previous boolean value', () => {
				const previousCase = { isGreenBelt: null };
				const newAnswer = true;

				const { oldValue, newValue } = resolveFieldValues('isGreenBelt', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, 'Yes');
			});

			it('should return "-" for null new boolean value', () => {
				const previousCase = { cilLiable: 'yes' };
				const newAnswer = null;

				const { oldValue, newValue } = resolveFieldValues('cilLiable', previousCase, newAnswer);

				assert.strictEqual(oldValue, 'Yes');
				assert.strictEqual(newValue, '-');
			});

			it('should handle all registered boolean fields without falling back to default resolver', () => {
				const booleanFields = [
					'hasSecondaryLpa',
					'containsDistressingContent',
					'hasAgent',
					'nationallyImportant',
					'isGreenBelt',
					'siteIsVisibleFromPublicLand',
					'environmentalImpactAssessment',
					'developmentPlan',
					'rightOfWay',
					'eiaScreening',
					'eiaScreeningOutcome',
					'hasApplicationFee',
					'eligibleForFeeRefund',
					'cilLiable',
					'bngExempt',
					'hasCostsApplications',
					'applicationReceivedDateEmailSent',
					'lpaQuestionnaireSpecialEmailSent',
					'lpaQuestionnaireReceivedEmailSent',
					'notNationallyImportantEmailSent'
				];

				for (const fieldName of booleanFields) {
					const { oldValue, newValue } = resolveFieldValues(fieldName, { [fieldName]: 'yes' }, true);
					assert.strictEqual(oldValue, 'Yes', `${fieldName}: expected oldValue 'Yes'`);
					assert.strictEqual(newValue, 'Yes', `${fieldName}: expected newValue 'Yes'`);
				}
			});
		});

		describe('monetary field resolvers', () => {
			it('should format previous number and new number to a monetary strings', () => {
				const previousCase = { applicationFee: 1.23 };
				const newAnswer = 1000.0;

				const { oldValue, newValue } = resolveFieldValues('applicationFee', previousCase, newAnswer);

				assert.strictEqual(oldValue, '£1.23');
				assert.strictEqual(newValue, '£1000.00');
			});

			it('should format integers', () => {
				const previousCase = { applicationFee: 1 };
				const newAnswer = 1000;

				const { oldValue, newValue } = resolveFieldValues('applicationFee', previousCase, newAnswer);

				assert.strictEqual(oldValue, '£1.00');
				assert.strictEqual(newValue, '£1000.00');
			});

			it('should return "-" for null previous monetary value', () => {
				const previousCase = { applicationFee: null };
				const newAnswer = 1000.0;

				const { oldValue, newValue } = resolveFieldValues('applicationFee', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '£1000.00');
			});

			it('should return "-" for null new monetary value', () => {
				const previousCase = { applicationFee: 1000.0 };
				const newAnswer = null;

				const { oldValue, newValue } = resolveFieldValues('applicationFee', previousCase, newAnswer);

				assert.strictEqual(oldValue, '£1000.00');
				assert.strictEqual(newValue, '-');
			});

			it('should handle all registered monetary fields without falling back to default resolver', () => {
				const monetaryFields = ['cilAmount', 'applicationFee', 'applicationFeeRefundAmount'];

				for (const fieldName of monetaryFields) {
					const { oldValue, newValue } = resolveFieldValues(fieldName, { [fieldName]: 1000 }, 2000);
					assert.strictEqual(oldValue, '£1000.00', `${fieldName}: expected oldValue '£1000.00'`);
					assert.strictEqual(newValue, '£2000.00', `${fieldName}: expected newValue '£2000.00'`);
				}
			});
		});
		describe('address field resolvers', () => {
			it('should use address resolver for siteAddress', async () => {
				const previousCase = {
					siteAddress: {
						line1: '123 Old Street',
						line2: 'Flat 1',
						townCity: 'London',
						county: 'Greater London',
						postcode: 'SW1A 1AA'
					}
				};
				const newAnswer = {
					addressLine1: '456 New Road',
					addressLine2: 'Unit 9',
					townCity: 'Manchester',
					county: 'Greater Manchester',
					postcode: 'M1 1AA'
				};

				const { oldValue, newValue } = resolveFieldValues('siteAddress', previousCase, newAnswer);

				assert.strictEqual(oldValue, '123 Old Street, Flat 1, London, Greater London, SW1A 1AA');
				assert.strictEqual(newValue, '456 New Road, Unit 9, Manchester, Greater Manchester, M1 1AA');
			});

			it('should use address resolver for agentOrganisationAddress', async () => {
				const previousCase = {
					agentOrganisationAddress: {
						addressLine1: '1 Agency House',
						addressLine2: 'Business Park',
						townCity: 'Bristol',
						county: 'Somerset',
						postcode: 'BS1 4DJ'
					}
				};
				const newAnswer = {
					line1: '2 Agency House',
					line2: 'Business Park',
					townCity: 'Bristol',
					county: 'Somerset',
					postcode: 'BS1 4DJ'
				};

				const { oldValue, newValue } = resolveFieldValues('agentOrganisationAddress', previousCase, newAnswer);

				assert.strictEqual(oldValue, '1 Agency House, Business Park, Bristol, Somerset, BS1 4DJ');
				assert.strictEqual(newValue, '2 Agency House, Business Park, Bristol, Somerset, BS1 4DJ');
			});

			it('should return "-" for null previous and null new agentOrganisationAddress', async () => {
				const previousCase = { agentOrganisationAddress: null };
				const newAnswer = null;

				const { oldValue, newValue } = resolveFieldValues('agentOrganisationAddress', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '-');
			});
		});
		describe('date range field resolvers', () => {
			it('should set newValues when previous case is null', async () => {
				const previousCase = { representationsPeriod: null };
				const newAnswer = {
					start: new Date('2026-01-01T00:00:00Z'),
					end: new Date('2026-01-15T00:00:00Z')
				};

				const { oldValue, newValue } = resolveFieldValues('representationsPeriod', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '1 January 2026 - 15 January 2026');
			});
			it('should format previous and new date range values', async () => {
				const previousCase = {
					representationsPeriod: {
						start: new Date('2026-01-01T00:00:00Z'),
						end: new Date('2026-01-15T00:00:00Z')
					}
				};
				const newAnswer = {
					start: new Date('2026-02-01T00:00:00Z'),
					end: new Date('2026-02-15T00:00:00Z')
				};

				const { oldValue, newValue } = resolveFieldValues('representationsPeriod', previousCase, newAnswer);

				assert.strictEqual(oldValue, '1 January 2026 - 15 January 2026');
				assert.strictEqual(newValue, '1 February 2026 - 15 February 2026');
			});
			it('should display start and end if only one updated in new answer', async () => {
				const previousCase = {
					representationsPeriod: {
						start: new Date('2026-01-01T00:00:00Z'),
						end: new Date('2026-01-15T00:00:00Z')
					}
				};
				const newAnswer = {
					start: new Date('2026-02-01T00:00:00Z'),
					end: new Date('2026-01-15T00:00:00Z') // unchanged
				};
				const { oldValue, newValue } = resolveFieldValues('representationsPeriod', previousCase, newAnswer);

				assert.strictEqual(oldValue, '1 January 2026 - 15 January 2026');
				assert.strictEqual(newValue, '1 February 2026 - 15 January 2026');
			});
		});
		describe('date and time field resolvers', () => {
			it('should set newValues when previous case is null', async () => {
				const previousCase = { siteVisitDate: null };
				const newAnswer = new Date('2026-01-01T14:30:00Z');

				const { oldValue, newValue } = resolveFieldValues('siteVisitDate', previousCase, newAnswer);

				assert.strictEqual(oldValue, '-');
				assert.strictEqual(newValue, '1 January 2026 2:30pm');
			});
			it('should format previous and new date and time values', async () => {
				const previousCase = {
					siteVisitDate: new Date('2026-01-01T14:30:00Z')
				};
				const newAnswer = new Date('2026-02-01T09:15:00Z');

				const { oldValue, newValue } = resolveFieldValues('siteVisitDate', previousCase, newAnswer);

				assert.strictEqual(oldValue, '1 January 2026 2:30pm');
				assert.strictEqual(newValue, '1 February 2026 9:15am');
			});
			it('should display both date and time if only time updated in new answer', async () => {
				const previousCase = {
					siteVisitDate: new Date('2026-01-01T14:30:00Z')
				};
				const newAnswer = new Date('2026-01-01T16:45:00Z'); // same date, different time

				const { oldValue, newValue } = resolveFieldValues('siteVisitDate', previousCase, newAnswer);

				assert.strictEqual(oldValue, '1 January 2026 2:30pm');
				assert.strictEqual(newValue, '1 January 2026 4:45pm');
			});
			it('should display both date and time if only date updated in new answer', async () => {
				const previousCase = {
					siteVisitDate: new Date('2026-01-01T14:30:00Z')
				};
				const newAnswer = new Date('2026-02-01T14:30:00Z'); // same time, different date

				const { oldValue, newValue } = resolveFieldValues('siteVisitDate', previousCase, newAnswer);

				assert.strictEqual(oldValue, '1 January 2026 2:30pm');
				assert.strictEqual(newValue, '1 February 2026 2:30pm');
			});
		});
	});
});

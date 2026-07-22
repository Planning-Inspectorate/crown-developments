import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFieldValues } from './field-resolver.ts';

describe('Field Resolver', () => {
	// Set environment before importing modules that depend on it
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	describe('getFieldDisplayName', () => {
		it('should return display name from FIELD_DISPLAY_NAMES for known fields', async () => {
			const { getFieldDisplayName } = await import('./field-resolver.ts');
			assert.strictEqual(getFieldDisplayName('siteArea'), 'Site area (ha)');
			assert.strictEqual(getFieldDisplayName('lpaReference'), 'LPA reference');
		});

		it('should fall back to sentence case for unknown fields', async () => {
			const { getFieldDisplayName } = await import('./field-resolver.ts');
			assert.strictEqual(getFieldDisplayName('unknownFieldName'), 'Unknown field name');
			assert.strictEqual(getFieldDisplayName('someOtherField'), 'Some other field');
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
			it('should use siteAddress resolver for address fields', async () => {
				const previousCase = {
					SiteAddress: {
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
				const previousCase = { SiteAddress: null };
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
	});
});

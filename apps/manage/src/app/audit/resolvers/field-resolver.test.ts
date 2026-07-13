import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

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
		it('should resolve simple scalar field values', async () => {
			const { resolveFieldValues } = await import('./field-resolver.ts');
			const previousCase = { siteArea: 10.5 };
			const newAnswer = 15.0;

			const { oldValue, newValue } = resolveFieldValues('siteArea', previousCase, newAnswer);

			assert.strictEqual(oldValue, '10.5');
			assert.strictEqual(newValue, '15');
		});

		it('should return "-" for null previous value', async () => {
			const { resolveFieldValues } = await import('./field-resolver.ts');
			const previousCase = { siteArea: null };
			const newAnswer = 12.5;

			const { oldValue, newValue } = resolveFieldValues('siteArea', previousCase, newAnswer);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, '12.5');
		});

		it('should return "-" for null new value', async () => {
			const { resolveFieldValues } = await import('./field-resolver.ts');
			const previousCase = { siteArea: 10.5 };
			const newAnswer = null;

			const { oldValue, newValue } = resolveFieldValues('siteArea', previousCase, newAnswer);

			assert.strictEqual(oldValue, '10.5');
			assert.strictEqual(newValue, '-');
		});

		it('should return "-" for undefined previous value', async () => {
			const { resolveFieldValues } = await import('./field-resolver.ts');
			const previousCase = {};
			const newAnswer = 'New Value';

			const { oldValue, newValue } = resolveFieldValues('lpaReference', previousCase, newAnswer);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, 'New Value');
		});

		it('should handle string values', async () => {
			const { resolveFieldValues } = await import('./field-resolver.ts');
			const previousCase = { lpaReference: 'ABC/123' };
			const newAnswer = 'XYZ/456';

			const { oldValue, newValue } = resolveFieldValues('lpaReference', previousCase, newAnswer);

			assert.strictEqual(oldValue, 'ABC/123');
			assert.strictEqual(newValue, 'XYZ/456');
		});

		it('should use siteAddress resolver for address fields', async () => {
			const { resolveFieldValues } = await import('./field-resolver.ts');
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
			const { resolveFieldValues } = await import('./field-resolver.ts');
			const previousCase = { SiteAddress: null };
			const newAnswer = null;

			const { oldValue, newValue } = resolveFieldValues('siteAddress', previousCase, newAnswer);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, '-');
		});
	});
});

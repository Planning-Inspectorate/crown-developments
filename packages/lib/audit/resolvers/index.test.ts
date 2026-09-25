import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	booleanResolver,
	dateResolver,
	entraUserResolver,
	monetaryResolver,
	getFieldDisplayName,
	resolveFieldValues,
	type FieldResolverRegistry
} from './index.ts';

const registry: FieldResolverRegistry = {
	hasAgent: booleanResolver('hasAgent'),
	caseOfficerId: entraUserResolver('caseOfficerId'),
	applicationFee: monetaryResolver('applicationFee'),
	decisionDate: dateResolver('decisionDate')
};

describe('getFieldDisplayName', () => {
	const FIELD_DISPLAY_NAMES: Record<string, string> = {
		siteArea: 'Site area (ha)',
		lpaReference: 'LPA reference'
	};

	it('should return display name from FIELD_DISPLAY_NAMES for known fields', () => {
		assert.strictEqual(getFieldDisplayName('siteArea', FIELD_DISPLAY_NAMES), 'Site area (ha)');
		assert.strictEqual(getFieldDisplayName('lpaReference', FIELD_DISPLAY_NAMES), 'LPA reference');
	});

	it('should fall back to sentence case for unknown fields', () => {
		assert.strictEqual(getFieldDisplayName('unknownFieldName', FIELD_DISPLAY_NAMES), 'Unknown field name');
		assert.strictEqual(getFieldDisplayName('someOtherField', FIELD_DISPLAY_NAMES), 'Some other field');
	});
});

describe('resolveFieldValues', () => {
	it('uses the default resolver for fields not in the registry', () => {
		const result = resolveFieldValues(registry, 'lpaReference', { lpaReference: 'ABC/123' }, 'DEF/345');

		assert.deepStrictEqual(result, { oldValue: 'ABC/123', newValue: 'DEF/345' });
	});

	it('uses the registered resolver when one exists', () => {
		const result = resolveFieldValues(registry, 'hasAgent', { hasAgent: 'no' }, true);

		assert.deepStrictEqual(result, { oldValue: 'No', newValue: 'Yes' });
	});

	it('passes the context through to the resolver', () => {
		const result = resolveFieldValues(registry, 'caseOfficerId', { caseOfficerId: 'user-1' }, 'user-2', {
			userDisplayNameMap: new Map([
				['user-1', 'Test User One'],
				['user-2', 'Test User Two']
			])
		});

		assert.deepStrictEqual(result, { oldValue: 'Test User One', newValue: 'Test User Two' });
	});
});

describe('booleanResolver', () => {
	it('handles yes/no strings on both sides', () => {
		const result = resolveFieldValues(registry, 'hasAgent', { hasAgent: 'yes' }, 'no');

		assert.deepStrictEqual(result, { oldValue: 'Yes', newValue: 'No' });
	});

	it('handles booleans on both sides', () => {
		const result = resolveFieldValues(registry, 'hasAgent', { hasAgent: false }, true);

		assert.deepStrictEqual(result, { oldValue: 'No', newValue: 'Yes' });
	});

	it('returns "-" for empty or unrecognised values', () => {
		const result = resolveFieldValues(registry, 'hasAgent', { hasAgent: null }, 'maybe');

		assert.deepStrictEqual(result, { oldValue: '-', newValue: '-' });
	});
});

describe('monetaryResolver', () => {
	it('formats numeric strings from the form', () => {
		const result = resolveFieldValues(registry, 'applicationFee', { applicationFee: 100 }, '1000.5');

		assert.deepStrictEqual(result, { oldValue: '£100.00', newValue: '£1000.50' });
	});

	it('formats zero as an amount rather than empty', () => {
		const result = resolveFieldValues(registry, 'applicationFee', { applicationFee: null }, 0);

		assert.deepStrictEqual(result, { oldValue: '-', newValue: '£0.00' });
	});

	it('returns "-" for an empty string', () => {
		const result = resolveFieldValues(registry, 'applicationFee', { applicationFee: 50 }, '');

		assert.deepStrictEqual(result, { oldValue: '£50.00', newValue: '-' });
	});
});

describe('dateResolver', () => {
	it('formats dates without a time', () => {
		const result = resolveFieldValues(
			registry,
			'decisionDate',
			{ decisionDate: new Date('2026-01-01T00:00:00Z') },
			new Date('2026-02-15T00:00:00Z')
		);

		assert.deepStrictEqual(result, { oldValue: '1 January 2026', newValue: '15 February 2026' });
	});

	it('returns "-" for empty values', () => {
		const result = resolveFieldValues(registry, 'decisionDate', { decisionDate: null }, null);

		assert.deepStrictEqual(result, { oldValue: '-', newValue: '-' });
	});
});

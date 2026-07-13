import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTemplate, AUDIT_ACTIONS } from './actions.ts';

describe('resolveTemplate', () => {
	it('should return template as-is when no metadata is provided', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED);
		assert.strictEqual(result, '{reference} was created');
	});

	it('should return template as-is when metadata is undefined', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, undefined);
		assert.strictEqual(result, '{reference} was created');
	});

	it('should replace a placeholder with a metadata value', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: 'DRT/PER/00015' });
		assert.strictEqual(result, 'DRT/PER/00015 was created');
	});

	it('should leave placeholder as-is when metadata key is missing', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, {});
		assert.strictEqual(result, '{reference} was created');
	});

	it('should leave placeholder as-is when metadata value is undefined', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: undefined });
		assert.strictEqual(result, '{reference} was created');
	});

	it('should leave placeholder as-is when metadata value is null', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: null });
		assert.strictEqual(result, '{reference} was created');
	});

	it('should convert numeric metadata values to strings', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: 42 });
		assert.strictEqual(result, '42 was created');
	});

	it('should ignore metadata keys that are not placeholders in the template', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: 'DRT/PER/00015', extra: 'ignored' });
		assert.strictEqual(result, 'DRT/PER/00015 was created');
	});

	describe('FIELD_SET action', () => {
		it('should resolve FIELD_SET template with fieldName and newValue', () => {
			const result = resolveTemplate(AUDIT_ACTIONS.FIELD_SET, {
				fieldName: 'Site area (ha)',
				newValue: '12.5'
			});
			assert.strictEqual(result, 'Site area (ha) was set to 12.5');
		});
	});

	describe('FIELD_CLEARED action', () => {
		it('should resolve FIELD_CLEARED template with fieldName and oldValue', () => {
			const result = resolveTemplate(AUDIT_ACTIONS.FIELD_CLEARED, {
				fieldName: 'LPA reference',
				oldValue: 'ABC/123'
			});
			assert.strictEqual(result, 'LPA reference (ABC/123) was removed');
		});
	});

	describe('FIELD_UPDATED action', () => {
		it('should resolve FIELD_UPDATED template with all placeholders', () => {
			const result = resolveTemplate(AUDIT_ACTIONS.FIELD_UPDATED, {
				fieldName: 'Hearing venue',
				oldValue: 'Town Hall',
				newValue: 'City Hall'
			});
			assert.strictEqual(result, 'Hearing venue was updated from Town Hall to City Hall');
		});
	});
});

describe('AUDIT_ACTIONS', () => {
	it('should have FIELD_SET action', () => {
		assert.strictEqual(AUDIT_ACTIONS.FIELD_SET, 'FIELD_SET');
	});

	it('should have FIELD_CLEARED action', () => {
		assert.strictEqual(AUDIT_ACTIONS.FIELD_CLEARED, 'FIELD_CLEARED');
	});

	it('should have FIELD_UPDATED action', () => {
		assert.strictEqual(AUDIT_ACTIONS.FIELD_UPDATED, 'FIELD_UPDATED');
	});
});

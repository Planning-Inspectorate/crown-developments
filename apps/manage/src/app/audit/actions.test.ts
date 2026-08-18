import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTemplate, resolveAuditAction, AUDIT_ACTIONS, AUDIT_TEMPLATES } from './actions.ts';

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
});

describe('standard field templates', () => {
	it('should resolve FIELD_SET template with fieldName and newValue', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FIELD_SET, {
			fieldName: 'Site area (ha)',
			newValue: '12.5'
		});
		assert.strictEqual(result, 'Site area (ha) was set to 12.5');
	});

	it('should resolve FIELD_CLEARED template with fieldName and oldValue', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FIELD_CLEARED, {
			fieldName: 'LPA reference',
			oldValue: 'ABC/123'
		});
		assert.strictEqual(result, 'LPA reference (ABC/123) was removed');
	});

	it('should resolve FIELD_UPDATED template with all placeholders', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FIELD_UPDATED, {
			fieldName: 'Hearing venue',
			oldValue: 'Town Hall',
			newValue: 'City Hall'
		});
		assert.strictEqual(result, 'Hearing venue was updated from Town Hall to City Hall');
	});
});

describe('long-text field templates', () => {
	it('should resolve LONG_FIELD_SET template with fieldName and newValue', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.LONG_FIELD_SET, {
			fieldName: 'Development description',
			newValue: 'New long text value'
		});
		assert.strictEqual(result, 'Development description was set');
	});

	it('should resolve LONG_FIELD_UPDATED template with fieldName', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.LONG_FIELD_UPDATED, {
			fieldName: 'Development description'
		});
		assert.strictEqual(result, 'Development description was updated');
	});

	it('should resolve LONG_FIELD_CLEARED template with fieldName', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.LONG_FIELD_CLEARED, {
			fieldName: 'Development description'
		});
		assert.strictEqual(result, 'Development description was removed');
	});

	it('should leave fieldName placeholder when metadata is missing for LONG_FIELD_UPDATED', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.LONG_FIELD_UPDATED);
		assert.strictEqual(result, '{fieldName} was updated');
	});
});

describe('AUDIT_ACTIONS', () => {
	it('should have long action constants', () => {
		assert.strictEqual(AUDIT_ACTIONS.LONG_FIELD_SET, 'LONG_FIELD_SET');
		assert.strictEqual(AUDIT_ACTIONS.LONG_FIELD_UPDATED, 'LONG_FIELD_UPDATED');
		assert.strictEqual(AUDIT_ACTIONS.LONG_FIELD_CLEARED, 'LONG_FIELD_CLEARED');
	});
});

describe('AUDIT_TEMPLATES', () => {
	it('should include long-text templates', () => {
		assert.strictEqual(AUDIT_TEMPLATES[AUDIT_ACTIONS.LONG_FIELD_SET], '{fieldName} was set');
		assert.strictEqual(AUDIT_TEMPLATES[AUDIT_ACTIONS.LONG_FIELD_UPDATED], '{fieldName} was updated');
		assert.strictEqual(AUDIT_TEMPLATES[AUDIT_ACTIONS.LONG_FIELD_CLEARED], '{fieldName} was removed');
	});
});

describe('resolveAuditAction', () => {
	describe('standard fields (isLongField false)', () => {
		it('should return FIELD_CLEARED when newValue is "-"', () => {
			assert.strictEqual(resolveAuditAction('Some value', '-'), AUDIT_ACTIONS.FIELD_CLEARED);
		});

		it('should return FIELD_SET when oldValue is "-"', () => {
			assert.strictEqual(resolveAuditAction('-', 'Some value'), AUDIT_ACTIONS.FIELD_SET);
		});

		it('should return FIELD_UPDATED when both values exist', () => {
			assert.strictEqual(resolveAuditAction('Old value', 'New value', false), AUDIT_ACTIONS.FIELD_UPDATED);
		});

		it('should default isLongField to false', () => {
			assert.strictEqual(resolveAuditAction('Old value', 'New value'), AUDIT_ACTIONS.FIELD_UPDATED);
		});
	});

	describe('long-text fields (isLongField true)', () => {
		it('should return LONG_FIELD_CLEARED when newValue is "-"', () => {
			assert.strictEqual(resolveAuditAction('Some text', '-', true), AUDIT_ACTIONS.LONG_FIELD_CLEARED);
		});

		it('should return LONG_FIELD_SET when oldValue is "-"', () => {
			assert.strictEqual(resolveAuditAction('-', 'Some text', true), AUDIT_ACTIONS.LONG_FIELD_SET);
		});

		it('should return LONG_FIELD_UPDATED when both values exist', () => {
			assert.strictEqual(resolveAuditAction('Old text', 'New text', true), AUDIT_ACTIONS.LONG_FIELD_UPDATED);
		});

		it('should prefer LONG_FIELD_CLEARED when both values are "-"', () => {
			assert.strictEqual(resolveAuditAction('-', '-', true), AUDIT_ACTIONS.LONG_FIELD_CLEARED);
		});
	});
});

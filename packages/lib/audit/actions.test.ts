import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	AUDIT_ACTIONS,
	LONG_FIELD_ACTIONS,
	fillTemplate,
	isAuditAction,
	resolveAuditAction,
	resolveTemplate
} from './actions.ts';
import { CASE_DATA_MODEL } from '../util/types.ts';

describe('fillTemplate', () => {
	const template = '{reference} was created';

	it('should return the template as-is when no metadata is provided', () => {
		assert.strictEqual(fillTemplate(template), '{reference} was created');
	});

	it('should replace a placeholder with a metadata value', () => {
		assert.strictEqual(fillTemplate(template, { reference: 'DRT/PER/00015' }), 'DRT/PER/00015 was created');
	});

	it('should leave the placeholder when the metadata key is missing, undefined or null', () => {
		assert.strictEqual(fillTemplate(template, {}), '{reference} was created');
		assert.strictEqual(fillTemplate(template, { reference: undefined }), '{reference} was created');
		assert.strictEqual(fillTemplate(template, { reference: null }), '{reference} was created');
	});

	it('should convert numbers to strings', () => {
		assert.strictEqual(fillTemplate(template, { reference: 42 }), '42 was created');
	});

	it('should leave the placeholder for values that are not primitives', () => {
		assert.strictEqual(fillTemplate(template, { reference: { nested: true } }), '{reference} was created');
	});

	it('should ignore metadata keys that are not in the template', () => {
		assert.strictEqual(
			fillTemplate(template, { reference: 'DRT/PER/00015', extra: 'ignored' }),
			'DRT/PER/00015 was created'
		);
	});
});

describe('isAuditAction', () => {
	it('should accept shared actions for every data model', () => {
		assert.ok(isAuditAction(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.FIELD_UPDATED));
		assert.ok(isAuditAction(CASE_DATA_MODEL.S62A, AUDIT_ACTIONS.FIELD_UPDATED));
	});

	it('should reject unknown actions', () => {
		assert.ok(!isAuditAction(CASE_DATA_MODEL.CROWN, 'NOT_AN_ACTION'));
		assert.ok(!isAuditAction(CASE_DATA_MODEL.S62A, 'NOT_AN_ACTION'));
	});
});

describe('resolveTemplate', () => {
	it('should use the templates for the data model', () => {
		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.CASE_CREATED, { reference: 'DRT/PER/00015' }),
			'DRT/PER/00015 was created'
		);
	});

	it('should resolve the standard field templates', () => {
		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.S62A, AUDIT_ACTIONS.FIELD_SET, {
				fieldName: 'Specialism',
				newValue: 'Tree preservation order'
			}),
			'Specialism was set to Tree preservation order'
		);
		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.S62A, AUDIT_ACTIONS.FIELD_UPDATED, {
				fieldName: 'Hearing venue',
				oldValue: 'Town Hall',
				newValue: 'City Hall'
			}),
			'Hearing venue was updated from "Town Hall" to "City Hall"'
		);
		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.S62A, AUDIT_ACTIONS.FIELD_CLEARED, {
				fieldName: 'LPA reference',
				oldValue: 'ABC/123'
			}),
			'LPA reference (ABC/123) was removed'
		);
	});

	it('should resolve the long field templates', () => {
		const metadata = { fieldName: 'Development description' };

		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.LONG_FIELD_SET, metadata),
			'Development description was set'
		);
		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.LONG_FIELD_UPDATED, metadata),
			'Development description was updated'
		);
		assert.strictEqual(
			resolveTemplate(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.LONG_FIELD_CLEARED, metadata),
			'Development description was removed'
		);
	});
});

describe('resolveAuditAction', () => {
	it('should pick set, updated or cleared', () => {
		assert.strictEqual(resolveAuditAction('-', 'New'), AUDIT_ACTIONS.FIELD_SET);
		assert.strictEqual(resolveAuditAction('Old', 'New'), AUDIT_ACTIONS.FIELD_UPDATED);
		assert.strictEqual(resolveAuditAction('Old', '-'), AUDIT_ACTIONS.FIELD_CLEARED);
	});

	it('should pick the long field actions for long fields', () => {
		assert.strictEqual(resolveAuditAction('-', 'New', true), AUDIT_ACTIONS.LONG_FIELD_SET);
		assert.strictEqual(resolveAuditAction('Old', 'New', true), AUDIT_ACTIONS.LONG_FIELD_UPDATED);
		assert.strictEqual(resolveAuditAction('Old', '-', true), AUDIT_ACTIONS.LONG_FIELD_CLEARED);
	});

	it('should prefer cleared when both values are empty', () => {
		assert.strictEqual(resolveAuditAction('-', '-', true), AUDIT_ACTIONS.LONG_FIELD_CLEARED);
	});
});

describe('LONG_FIELD_ACTIONS', () => {
	it('should contain only the long field actions', () => {
		assert.deepStrictEqual(
			[...LONG_FIELD_ACTIONS].sort(),
			[AUDIT_ACTIONS.LONG_FIELD_CLEARED, AUDIT_ACTIONS.LONG_FIELD_SET, AUDIT_ACTIONS.LONG_FIELD_UPDATED].sort()
		);
	});
});

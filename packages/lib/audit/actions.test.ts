import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	AUDIT_ACTIONS,
	LONG_FIELD_ACTIONS,
	SHARED_AUDIT_TEMPLATES,
	fillTemplate,
	isAuditAction,
	resolveAuditAction,
	resolveTemplate,
	type AuditTemplates
} from './actions.ts';

/** Templates as an app would pass them: the shared ones plus one of its own */
const TEMPLATES: AuditTemplates = {
	...SHARED_AUDIT_TEMPLATES,
	TEST_ITEM_ADDED: '{name} was added to test items.'
};

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
	it('should accept actions that have a template', () => {
		assert.ok(isAuditAction(TEMPLATES, AUDIT_ACTIONS.FIELD_UPDATED));
		assert.ok(isAuditAction(TEMPLATES, 'TEST_ITEM_ADDED'));
	});

	it('should only accept actions in the templates it is given', () => {
		assert.ok(!isAuditAction(SHARED_AUDIT_TEMPLATES, 'TEST_ITEM_ADDED'));
	});

	it('should reject unknown actions', () => {
		assert.ok(!isAuditAction(TEMPLATES, 'NOT_AN_ACTION'));
	});

	it('should not treat inherited object properties as actions', () => {
		assert.ok(!isAuditAction(TEMPLATES, 'toString'));
	});
});

describe('resolveTemplate', () => {
	it('should use the templates it is given', () => {
		assert.strictEqual(
			resolveTemplate(TEMPLATES, 'TEST_ITEM_ADDED', { name: 'Test item' }),
			'Test item was added to test items.'
		);
	});

	it('should resolve the case templates', () => {
		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.CASE_CREATED, { reference: 'DRT/PER/00015' }),
			'DRT/PER/00015 was created'
		);
	});

	it('should resolve the standard field templates', () => {
		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.FIELD_SET, {
				fieldName: 'Specialism',
				newValue: 'Tree preservation order'
			}),
			'Specialism was set to Tree preservation order'
		);
		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.FIELD_UPDATED, {
				fieldName: 'Hearing venue',
				oldValue: 'Town Hall',
				newValue: 'City Hall'
			}),
			'Hearing venue was updated from "Town Hall" to "City Hall"'
		);
		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.FIELD_CLEARED, {
				fieldName: 'LPA reference',
				oldValue: 'ABC/123'
			}),
			'LPA reference (ABC/123) was removed'
		);
	});

	it('should resolve the long field templates', () => {
		const metadata = { fieldName: 'Development description' };

		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.LONG_FIELD_SET, metadata),
			'Development description was set'
		);
		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.LONG_FIELD_UPDATED, metadata),
			'Development description was updated'
		);
		assert.strictEqual(
			resolveTemplate(TEMPLATES, AUDIT_ACTIONS.LONG_FIELD_CLEARED, metadata),
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

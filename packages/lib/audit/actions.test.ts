import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_ACTIONS, LONG_FIELD_ACTIONS, isAuditAction, resolveAuditAction, resolveTemplate } from './actions.ts';
import { CASE_DATA_MODEL } from '../util/types.ts';
import { S62A_AUDIT_ACTIONS } from '../../../apps/manage/src/app/views/s62a/cases/audit/actions.ts';

describe('isAuditAction', () => {
	it('should accept shared actions for every data model', () => {
		assert.ok(isAuditAction(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.FIELD_UPDATED));
		assert.ok(isAuditAction(CASE_DATA_MODEL.S62A, AUDIT_ACTIONS.FIELD_UPDATED));
	});

	it('should only accept model-specific actions for that data model', () => {
		assert.ok(isAuditAction(CASE_DATA_MODEL.S62A, S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED));
		assert.ok(!isAuditAction(CASE_DATA_MODEL.CROWN, S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED));
	});

	it('should reject unknown actions', () => {
		assert.ok(!isAuditAction(CASE_DATA_MODEL.S62A, 'NOT_AN_ACTION'));
	});
});

describe('resolveTemplate', () => {
	it('should fill placeholders using the data model templates', () => {
		const details = resolveTemplate(CASE_DATA_MODEL.S62A, AUDIT_ACTIONS.FIELD_SET, {
			fieldName: 'Specialism',
			newValue: 'Tree preservation order'
		});

		assert.strictEqual(details, 'Specialism was set to Tree preservation order');
	});

	it('should leave unknown placeholders visible', () => {
		const details = resolveTemplate(CASE_DATA_MODEL.CROWN, AUDIT_ACTIONS.FIELD_SET, { fieldName: 'Specialism' });

		assert.strictEqual(details, 'Specialism was set to {newValue}');
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
});

describe('LONG_FIELD_ACTIONS', () => {
	it('should contain only the long field actions', () => {
		assert.deepStrictEqual(
			[...LONG_FIELD_ACTIONS].sort(),
			[AUDIT_ACTIONS.LONG_FIELD_CLEARED, AUDIT_ACTIONS.LONG_FIELD_SET, AUDIT_ACTIONS.LONG_FIELD_UPDATED].sort()
		);
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UNKNOWN_AUDIT_USER_ID, getAuditUserId } from './user.ts';

describe('getAuditUserId', () => {
	it('should return the user ID when there is one', () => {
		assert.strictEqual(getAuditUserId('user-1'), 'user-1');
	});

	it('should fall back to the unknown user when there is no user ID', () => {
		assert.strictEqual(getAuditUserId(undefined), UNKNOWN_AUDIT_USER_ID);
		assert.strictEqual(getAuditUserId(null), UNKNOWN_AUDIT_USER_ID);
		assert.strictEqual(getAuditUserId(''), UNKNOWN_AUDIT_USER_ID);
	});
});

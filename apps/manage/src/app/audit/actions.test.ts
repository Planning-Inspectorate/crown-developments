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
});

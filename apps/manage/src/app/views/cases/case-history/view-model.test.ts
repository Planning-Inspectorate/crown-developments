import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCaseHistoryViewModel } from './view-model.ts';
import type { AuditEvent } from '../../../audit/types.ts';

describe('createCaseHistoryViewModel', () => {
	const event = (overrides: Partial<AuditEvent & { userName: string }> = {}): AuditEvent & { userName: string } => ({
		id: 'evt-1',
		caseId: 'case-1',
		action: 'CASE_CREATED',
		userId: 'user-1',
		createdAt: new Date('2026-02-11T14:31:00Z'),
		metadata: { reference: 'REF-001' },
		userName: 'Jane Smith',
		...overrides
	});

	it('should map audit events to case history rows correctly', () => {
		const events = [
			event({
				id: 'evt-1',
				action: 'CASE_CREATED',
				createdAt: new Date('2026-02-11T14:31:00Z'),
				userName: 'Jane Smith'
			}),
			event({
				id: 'evt-2',
				action: 'CASE_CREATED',
				createdAt: new Date('2026-01-05T09:05:00Z'),
				metadata: null,
				userName: 'John Doe'
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 2);

		assert.strictEqual(result[0].user, 'Jane Smith');
		assert.ok(result[0].dateTimeFormatted.includes('11'));
		assert.ok(result[0].dateTimeFormatted.includes('February'));
		assert.ok(result[0].dateTimeFormatted.includes('2026'));
		assert.ok(typeof result[0].dateTimeFormatted === 'string');
		assert.ok(typeof result[0].details === 'string');

		assert.strictEqual(result[1].user, 'John Doe');
		assert.ok(result[1].dateTimeFormatted.includes('5'));
		assert.ok(result[1].dateTimeFormatted.includes('January'));
		assert.ok(result[1].dateTimeFormatted.includes('2026'));
	});

	it('should format dateTime as "day month year" with time (en-GB locale)', () => {
		const events = [event({ createdAt: new Date('2026-02-11T14:31:00Z') })];

		const result = createCaseHistoryViewModel(events);

		// 14:31 UTC → London (GMT in February) → "11 February 2026 2:31pm"
		assert.strictEqual(result[0].dateTimeFormatted, '11 February 2026 2:31pm');
	});

	it('should suppress the time portion at midnight', () => {
		// 00:00 London → date only, no time appended
		const events = [event({ createdAt: new Date('2026-02-11T00:00:00Z') })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].dateTimeFormatted, '11 February 2026');
	});

	it('should use userName from the event', () => {
		const events = [event({ userName: 'Unknown User' })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].user, 'Unknown User');
	});

	it('should pass metadata to resolveTemplate for details', () => {
		const events = [event({ action: 'CASE_CREATED', metadata: { reference: 'DRT/PER/00015' } })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].details, 'DRT/PER/00015 was created');
	});

	it('should handle null metadata gracefully', () => {
		const events = [event({ action: 'CASE_CREATED', metadata: null })];

		const result = createCaseHistoryViewModel(events);

		// With no metadata, the placeholder is left intact
		assert.strictEqual(result[0].details, '{reference} was created');
	});

	it('should return empty array if no events provided', () => {
		const result = createCaseHistoryViewModel([]);

		assert.deepStrictEqual(result, []);
	});

	it('should preserve event order in output', () => {
		const events = [event({ userName: 'First' }), event({ userName: 'Second' }), event({ userName: 'Third' })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].user, 'First');
		assert.strictEqual(result[1].user, 'Second');
		assert.strictEqual(result[2].user, 'Third');
	});

	it('should keep standard shape for non-long rows', () => {
		const events = [event({ action: 'CASE_CREATED', metadata: { reference: 'REF-123' } })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].details, 'REF-123 was created');
		assert.strictEqual(result[0].action, 'CASE_CREATED');
		assert.strictEqual(result[0].longDetails, undefined);
	});

	it('should build longDetails for updated long fields', () => {
		const events = [
			event({
				action: 'LONG_FIELD_UPDATED',
				metadata: {
					fieldName: 'Description',
					oldValue: 'Old description',
					newValue: 'New description'
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].action, 'LONG_FIELD_UPDATED');
		assert.strictEqual(result[0].details, 'Description was updated');
		assert.strictEqual(result[0].longDetails?.length, 2);
		assert.deepStrictEqual(result[0].longDetails?.[0], {
			label: 'Previous Description',
			value: 'Old description'
		});
		assert.deepStrictEqual(result[0].longDetails?.[1], {
			label: 'New Description',
			value: 'New description'
		});
	});
	it('should build longDetails for set long fields using newValue', () => {
		const events = [
			event({
				action: 'LONG_FIELD_SET',
				metadata: {
					fieldName: 'Description',
					newValue: 'A newly set long description'
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].action, 'LONG_FIELD_SET');
		assert.strictEqual(result[0].details, 'Description was set');
		assert.strictEqual(result[0].longDetails?.length, 1);
		assert.deepStrictEqual(result[0].longDetails?.[0], {
			label: 'New Description',
			value: 'A newly set long description'
		});
	});
	it('should build longDetails for cleared long fields using oldValue', () => {
		const events = [
			event({
				action: 'LONG_FIELD_CLEARED',
				metadata: {
					fieldName: 'Description',
					oldValue: 'A long value that was removed'
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].action, 'LONG_FIELD_CLEARED');
		assert.strictEqual(result[0].details, 'Description was removed');
		assert.strictEqual(result[0].longDetails?.length, 1);
		assert.deepStrictEqual(result[0].longDetails?.[0], {
			label: 'Previous Description',
			value: 'A long value that was removed'
		});
	});
	it('should omit longDetails when long values are missing', () => {
		const events = [
			event({
				action: 'LONG_FIELD_SET',
				metadata: {
					fieldName: 'Description'
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].details, 'Description was set');
		assert.strictEqual(result[0].longDetails, undefined);
	});
	it('should filter out empty values in updated long fields', () => {
		const events = [
			event({
				action: 'LONG_FIELD_UPDATED',
				metadata: {
					fieldName: 'Description',
					oldValue: 'Old value',
					newValue: ''
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		// Only the old value should be present
		assert.strictEqual(result[0].longDetails?.length, 1);
		assert.strictEqual(result[0].longDetails?.[0]?.label, 'Previous Description');
	});

	it('should omit empty longDetails when both old and new values are empty', () => {
		const events = [
			event({
				action: 'LONG_FIELD_UPDATED',
				metadata: {
					fieldName: 'Description',
					oldValue: '',
					newValue: ''
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		// Both filtered out, so array is empty
		assert.strictEqual(result[0].longDetails?.length, undefined);
	});

	it('should preserve multiline values with newlines', () => {
		const events = [
			event({
				action: 'LONG_FIELD_SET',
				metadata: {
					fieldName: 'Description',
					newValue: 'Line 1\nLine 2\nLine 3'
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		// Value should keep the newlines intact (template will convert to <br>)
		assert.strictEqual(result[0].longDetails?.[0]?.value, 'Line 1\nLine 2\nLine 3');
	});

	it('should gracefully handle non-string metadata values', () => {
		const events = [
			event({
				action: 'LONG_FIELD_SET',
				metadata: {
					fieldName: 'Description',
					newValue: 12345 // Number instead of string
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		// Should fall back to empty string, no longDetails
		assert.strictEqual(result[0].longDetails, undefined);
	});

	it('should handle missing fieldName gracefully', () => {
		const events = [
			event({
				action: 'LONG_FIELD_UPDATED',
				metadata: {
					oldValue: 'Old value',
					newValue: 'New value'
					// fieldName missing
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		// Labels should still be readable without crashing
		assert.strictEqual(result[0].longDetails?.[0]?.label, 'Previous ');
		assert.strictEqual(result[0].longDetails?.[1]?.label, 'New ');
	});

	it('should not create longDetails for set long if metadata value is not a string', () => {
		const events = [
			event({
				action: 'LONG_FIELD_SET',
				metadata: {
					fieldName: 'Description',
					newValue: { some: 'object' }
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].longDetails, undefined);
	});

	it('should not create longDetails for cleared long if oldValue is null', () => {
		const events = [
			event({
				action: 'LONG_FIELD_CLEARED',
				metadata: {
					fieldName: 'Description',
					oldValue: null
				}
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].longDetails, undefined);
	});
});

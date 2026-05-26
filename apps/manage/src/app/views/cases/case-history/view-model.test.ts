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
<<<<<<< HEAD
		assert.ok(result[0].dateTimeFormatted.includes('11'));
		assert.ok(result[0].dateTimeFormatted.includes('February'));
		assert.ok(result[0].dateTimeFormatted.includes('2026'));
		assert.ok(typeof result[0].dateTimeFormatted === 'string');
		assert.ok(typeof result[0].details === 'string');

		assert.strictEqual(result[1].user, 'John Doe');
		assert.ok(result[1].dateTimeFormatted.includes('5'));
		assert.ok(result[1].dateTimeFormatted.includes('January'));
		assert.ok(result[1].dateTimeFormatted.includes('2026'));
=======
		assert.ok(result[0].dateTime.includes('11'));
		assert.ok(result[0].dateTime.includes('February'));
		assert.ok(result[0].dateTime.includes('2026'));
		assert.ok(typeof result[0].dateTime === 'string');
		assert.ok(typeof result[0].details === 'string');

		assert.strictEqual(result[1].user, 'John Doe');
		assert.ok(result[1].dateTime.includes('5'));
		assert.ok(result[1].dateTime.includes('January'));
		assert.ok(result[1].dateTime.includes('2026'));
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
	});

	it('should format dateTime as "day month year" with time (en-GB locale)', () => {
		const events = [event({ createdAt: new Date('2026-02-11T14:31:00Z') })];

		const result = createCaseHistoryViewModel(events);

		// 14:31 UTC → London (GMT in February) → "11 February 2026 2:31pm"
<<<<<<< HEAD
		assert.strictEqual(result[0].dateTimeFormatted, '11 February 2026 2:31pm');
=======
		assert.strictEqual(result[0].dateTime, '11 February 2026 2:31pm');
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
	});

	it('should suppress the time portion at midnight', () => {
		// 00:00 London → date only, no time appended
		const events = [event({ createdAt: new Date('2026-02-11T00:00:00Z') })];

		const result = createCaseHistoryViewModel(events);

<<<<<<< HEAD
		assert.strictEqual(result[0].dateTimeFormatted, '11 February 2026');
=======
		assert.strictEqual(result[0].dateTime, '11 February 2026');
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
	});

	it('should use userName from the event', () => {
		const events = [event({ userName: 'Unknown User' })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].user, 'Unknown User');
	});

	it('should pass metadata to resolveTemplate for details', () => {
		const events = [event({ action: 'CASE_CREATED', metadata: { reference: 'DRT/PER/00015' } })];

		const result = createCaseHistoryViewModel(events);

		// The details string should be resolved from the template using metadata
		assert.strictEqual(result[0].details, 'DRT/PER/00015 was created');
	});

	it('should handle null metadata gracefully', () => {
		const events = [event({ action: 'CASE_CREATED', metadata: null })];

		const result = createCaseHistoryViewModel(events);

		assert.ok(typeof result[0].details === 'string');
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

	it('should return objects matching CaseHistoryRow interface', () => {
		const events = [event()];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 1);
<<<<<<< HEAD
		assert.ok('dateTimeFormatted' in result[0]);
		assert.ok('details' in result[0]);
		assert.ok('user' in result[0]);
		assert.strictEqual(Object.keys(result[0]).length, 3);
=======
		assert.ok('dateTime' in result[0]);
		assert.ok('details' in result[0]);
		assert.ok('user' in result[0]);
		assert.ok('files' in result[0]);
		assert.strictEqual(Object.keys(result[0]).length, 4);
	});

	it('should not include files for non-bulk actions even if metadata has files', () => {
		const events = [
			event({
				action: 'CASE_CREATED',
				metadata: { reference: 'REF-001', files: ['sneaky.pdf'] }
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].files, undefined);
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
	});
});

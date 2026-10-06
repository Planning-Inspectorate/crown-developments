import { describe, it } from 'node:test';
import assert from 'node:assert';
import { connectOrDisconnect, assignOptionalRelation, assignRepresentationsPeriod } from './shared-case-updates.ts';

describe('shared-case-updates', () => {
	describe('connectOrDisconnect', () => {
		it('returns a connect payload for a truthy id', () => {
			assert.deepStrictEqual(connectOrDisconnect('abc'), { connect: { id: 'abc' } });
		});

		it('returns a disconnect payload for null', () => {
			assert.deepStrictEqual(connectOrDisconnect(null), { disconnect: true });
		});

		it('returns a disconnect payload for undefined', () => {
			assert.deepStrictEqual(connectOrDisconnect(undefined), { disconnect: true });
		});

		it('returns a disconnect payload for an empty string', () => {
			assert.deepStrictEqual(connectOrDisconnect(''), { disconnect: true });
		});
	});

	describe('assignOptionalRelation', () => {
		it('does nothing when the field was not present in the edits', () => {
			const input: { Status?: unknown } = {};
			assignOptionalRelation(input, 'Status', false, 'some-id');
			assert.strictEqual('Status' in input, false);
		});

		it('connects the relation when present and an id is given', () => {
			const input: { Status?: unknown } = {};
			assignOptionalRelation(input, 'Status', true, 'status-1');
			assert.deepStrictEqual(input.Status, { connect: { id: 'status-1' } });
		});

		it('disconnects the relation when present and the id is null', () => {
			const input: { Status?: unknown } = {};
			assignOptionalRelation(input, 'Status', true, null);
			assert.deepStrictEqual(input.Status, { disconnect: true });
		});

		it('disconnects the relation when present and the id is undefined', () => {
			const input: { Status?: unknown } = {};
			assignOptionalRelation(input, 'Status', true, undefined);
			assert.deepStrictEqual(input.Status, { disconnect: true });
		});
	});

	describe('assignRepresentationsPeriod', () => {
		it('maps start and end dates onto the input', () => {
			const start = new Date('2026-01-01');
			const end = new Date('2026-02-01');
			const input: { representationsPeriodStartDate?: Date | null; representationsPeriodEndDate?: Date | null } = {};

			assignRepresentationsPeriod(input, { start, end });

			assert.strictEqual(input.representationsPeriodStartDate, start);
			assert.strictEqual(input.representationsPeriodEndDate, end);
		});

		it('nulls out both dates when the period is undefined', () => {
			const input: { representationsPeriodStartDate?: Date | null; representationsPeriodEndDate?: Date | null } = {};

			assignRepresentationsPeriod(input, undefined);

			assert.strictEqual(input.representationsPeriodStartDate, null);
			assert.strictEqual(input.representationsPeriodEndDate, null);
		});

		it('nulls out both dates when the period is null', () => {
			const input: { representationsPeriodStartDate?: Date | null; representationsPeriodEndDate?: Date | null } = {};

			assignRepresentationsPeriod(input, null);

			assert.strictEqual(input.representationsPeriodStartDate, null);
			assert.strictEqual(input.representationsPeriodEndDate, null);
		});

		it('nulls out a missing start/end while keeping the other', () => {
			const end = new Date('2026-02-01');
			const input: { representationsPeriodStartDate?: Date | null; representationsPeriodEndDate?: Date | null } = {};

			assignRepresentationsPeriod(input, { end });

			assert.strictEqual(input.representationsPeriodStartDate, null);
			assert.strictEqual(input.representationsPeriodEndDate, end);
		});
	});
});

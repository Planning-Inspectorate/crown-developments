import { describe, it } from 'node:test';
import assert from 'node:assert';
import { inspectorsToOffer } from './case-team-inspectors.ts';

describe('inspectorsToOffer', () => {
	const inspectors = [
		{ id: 'tom', displayName: 'Tom Reeves' },
		{ id: 'lisa', displayName: 'Lisa Knowles' },
		{ id: 'sam', displayName: 'Sam Patel' }
	];
	const ids = (offered: { id: string }[]) => offered.map((inspector) => inspector.id);

	it('leaves out inspectors already on the case when adding an entry', () => {
		const caseTeam = [
			{ id: 'entry-1', inspectorId: 'tom' },
			{ id: 'entry-2', inspectorId: 'lisa' }
		];

		assert.deepStrictEqual(ids(inspectorsToOffer(inspectors, caseTeam, 'new-entry')), ['sam']);
	});

	it("keeps the entry's own inspector when changing it", () => {
		const caseTeam = [
			{ id: 'entry-1', inspectorId: 'tom' },
			{ id: 'entry-2', inspectorId: 'lisa' }
		];

		assert.deepStrictEqual(ids(inspectorsToOffer(inspectors, caseTeam, 'entry-1')), ['tom', 'sam']);
	});

	it('offers everyone outside an entry, so the check page and tab can still name each inspector', () => {
		const caseTeam = [{ id: 'entry-1', inspectorId: 'tom' }];

		assert.deepStrictEqual(ids(inspectorsToOffer(inspectors, caseTeam, null)), ['tom', 'lisa', 'sam']);
		assert.deepStrictEqual(ids(inspectorsToOffer(inspectors, caseTeam, undefined)), ['tom', 'lisa', 'sam']);
	});

	it('offers everyone when the case has no inspectors yet', () => {
		assert.deepStrictEqual(ids(inspectorsToOffer(inspectors, undefined, 'new-entry')), ['tom', 'lisa', 'sam']);
	});

	it('ignores an entry with no inspector chosen yet', () => {
		assert.deepStrictEqual(ids(inspectorsToOffer(inspectors, [{ id: 'entry-1' }], 'new-entry')), [
			'tom',
			'lisa',
			'sam'
		]);
	});
});

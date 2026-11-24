import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { areRepresentationsPublished, publicRepresentationWhere } from './representation-access.ts';

describe('Crown public representation access', () => {
	for (const now of [new Date('2026-07-15T00:00:00+01:00'), new Date('2026-07-15T23:59:59+01:00')]) {
		it(`should use publication days at ${now.toISOString()}`, (context) => {
			context.mock.timers.enable({ apis: ['Date'], now });
			assert.equal(areRepresentationsPublished(null), false);
			assert.equal(areRepresentationsPublished(undefined), false);
			assert.equal(areRepresentationsPublished(new Date('invalid')), false);
			assert.equal(areRepresentationsPublished(new Date('2026-07-16T00:00:00+01:00')), false);
			assert.equal(areRepresentationsPublished(new Date('2026-07-14T00:00:00+01:00')), true);
			assert.equal(areRepresentationsPublished(new Date('2026-07-15T00:00:00+01:00')), true);
			assert.equal(areRepresentationsPublished(new Date('2026-07-15T23:59:59+01:00')), true);
		});
	}

	it('should restrict public queries to accepted representations of the requested application', () => {
		assert.deepEqual(publicRepresentationWhere('application-id'), {
			applicationId: 'application-id',
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED
		});
	});
});

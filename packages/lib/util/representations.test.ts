import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	areRepresentationsPublished,
	publicRepresentationWhere,
	representationsPublishedWhere
} from './representations.ts';

describe('public representation access', () => {
	it('should enforce the exact publication timestamp', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-07-15T10:00:00.000Z') });
		assert.equal(areRepresentationsPublished(null), false);
		assert.equal(areRepresentationsPublished(undefined), false);
		assert.equal(areRepresentationsPublished(new Date('invalid')), false);
		assert.equal(areRepresentationsPublished(new Date('2026-07-15T10:00:00.001Z')), false);
		assert.equal(areRepresentationsPublished(new Date('2026-07-15T10:00:00.000Z')), true);
		assert.equal(areRepresentationsPublished(new Date('2026-07-15T09:59:59.999Z')), true);
	});

	it('should restrict public queries to accepted representations of the requested application', () => {
		assert.deepEqual(publicRepresentationWhere('application-id'), {
			applicationId: 'application-id',
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED
		});
	});

	it('should build an inclusive publication timestamp filter', (context) => {
		const now = new Date('2026-07-15T10:00:00.000Z');
		context.mock.timers.enable({ apis: ['Date'], now });
		assert.deepEqual(representationsPublishedWhere(), { representationsPublishDate: { lte: now } });
	});
});

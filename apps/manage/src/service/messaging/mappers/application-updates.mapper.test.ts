import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapApplicationUpdatesToOdwSchema } from './application-updates.mapper.ts';
import type { ApplicationUpdateOdwPayload } from './application-updates.mapper.ts';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { CASE_TYPE } from '@pins/crowndev-lib/odw/odw-publisher.ts';
import { getCachedAjv } from '@pins/crowndev-lib/odw/cached-ajv.ts';

const SCHEMA_ID = 'applications-application-update.schema.json';

function buildUpdate(overrides: Partial<ApplicationUpdateOdwPayload> = {}): ApplicationUpdateOdwPayload {
	return {
		id: 'AAAAAAAA-1234-1234-1234-AAAAAAAAAAAA',
		applicationId: 'BBBBBBBB-1234-1234-1234-BBBBBBBBBBBB',
		statusId: APPLICATION_UPDATE_STATUS_ID.PUBLISHED,
		details: 'Some update',
		firstPublished: new Date('2026-11-17T10:00:00.000Z'),
		unpublishedDate: null,
		lastEdited: new Date('2026-11-18T09:30:00.000Z'),
		Application: { reference: 'CROWN/2025/0000001' },
		...overrides
	};
}

describe('application-updates.mapper', () => {
	describe('mapApplicationUpdatesToOdwSchema', () => {
		it('should map all fields to the ODW schema shape', () => {
			const result = mapApplicationUpdatesToOdwSchema(buildUpdate());

			assert.deepStrictEqual(result, {
				id: 'AAAAAAAA-1234-1234-1234-AAAAAAAAAAAA',
				caseReference: 'CROWN/2025/0000001',
				caseId: 'BBBBBBBB-1234-1234-1234-BBBBBBBBBBBB',
				caseType: CASE_TYPE.crown,
				applicationUpdateStatus: 'Published',
				details: 'Some update',
				firstPublished: '2026-11-17T10:00:00.000Z',
				unpublishedDate: null,
				lastEdited: '2026-11-18T09:30:00.000Z'
			});
		});

		const statuses = [
			{ statusId: APPLICATION_UPDATE_STATUS_ID.DRAFT, expected: 'Draft' },
			{ statusId: APPLICATION_UPDATE_STATUS_ID.PUBLISHED, expected: 'Published' },
			{ statusId: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED, expected: 'Unpublished' }
		];
		for (const { statusId, expected } of statuses) {
			it(`should map statusId "${statusId}" to "${expected}"`, () => {
				const result = mapApplicationUpdatesToOdwSchema(buildUpdate({ statusId }));
				assert.strictEqual(result.applicationUpdateStatus, expected);
			});
		}

		it('should throw for an unknown statusId', () => {
			assert.throws(() => mapApplicationUpdatesToOdwSchema(buildUpdate({ statusId: 'archived' })), {
				message: 'Unknown statusId: archived'
			});
		});

		it('should map all dates to ISO strings when set', () => {
			const result = mapApplicationUpdatesToOdwSchema(
				buildUpdate({
					statusId: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED,
					unpublishedDate: new Date('2026-11-20T12:00:00.000Z')
				})
			);
			assert.strictEqual(result.firstPublished, '2026-11-17T10:00:00.000Z');
			assert.strictEqual(result.unpublishedDate, '2026-11-20T12:00:00.000Z');
			assert.strictEqual(result.lastEdited, '2026-11-18T09:30:00.000Z');
		});

		it('should map null dates to null', () => {
			const result = mapApplicationUpdatesToOdwSchema(
				buildUpdate({
					statusId: APPLICATION_UPDATE_STATUS_ID.DRAFT,
					firstPublished: null,
					unpublishedDate: null,
					lastEdited: null
				})
			);
			assert.strictEqual(result.firstPublished, null);
			assert.strictEqual(result.unpublishedDate, null);
			assert.strictEqual(result.lastEdited, null);
		});

		describe('schema validation', () => {
			const cases = [
				{ name: 'published update', update: buildUpdate() },
				{
					name: 'draft update with null dates',
					update: buildUpdate({
						statusId: APPLICATION_UPDATE_STATUS_ID.DRAFT,
						firstPublished: null,
						lastEdited: null
					})
				},
				{
					name: 'unpublished update',
					update: buildUpdate({
						statusId: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED,
						unpublishedDate: new Date('2026-11-20T12:00:00.000Z')
					})
				}
			];
			for (const { name, update } of cases) {
				it(`should produce a schema-valid message for a ${name}`, async () => {
					const validate = (await getCachedAjv()).getSchema(SCHEMA_ID);
					assert.ok(validate, `${SCHEMA_ID} not registered`);

					const result = mapApplicationUpdatesToOdwSchema(update);
					assert.strictEqual(validate(result), true, JSON.stringify(validate.errors));
				});
			}
		});
	});
});

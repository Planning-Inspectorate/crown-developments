import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { mockLogger } from '@planning-inspectorate/core/testing';
import type { Service } from '@pins/crowndev-lib/app/base-service.ts';
import { buildS62AWrittenRepresentationsReadMorePage } from './controller.ts';

const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
const representationReference = 'AAAAA-BBBBB';

function createRequest(id = applicationId, reference = representationReference) {
	return {
		params: { applicationId: id, representationReference: reference },
		originalUrl: `/applications/${id}/written-representations/${reference}`
	};
}

function createResponse() {
	return { render: mock.fn(), status: mock.fn(), send: mock.fn() };
}

function createDatabase(
	representationsPublishDate: Date | null,
	representation: unknown = {
		id: 'representation-id',
		reference: representationReference,
		submittedDate: new Date('2025-01-15'),
		comment: 'Representation comment',
		commentRedacted: null,
		submittedByAgentOrgName: null,
		submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
		representedTypeId: null,
		representedGroupName: null,
		containsAttachments: false,
		distressingContentInRepresentation: false,
		SubmittedByContact: { firstName: 'Alex', lastName: 'Example' },
		RepresentedContacts: [],
		Category: { displayName: 'General' },
		Attachments: []
	},
	application: Record<string, unknown> | null = {
		id: applicationId,
		reference: 'S62A/2025/0001',
		representationsPeriodStartDate: new Date('2025-01-01'),
		representationsPeriodEndDate: new Date('2025-02-01'),
		representationsPublishDate,
		S62aDates: { withdrawnDate: null }
	}
) {
	return {
		s62aCase: {
			findUnique: mock.fn(() => application)
		},
		s62aRepresentation: {
			findUnique: mock.fn(() => representation)
		}
	};
}

function createHandler(db: ReturnType<typeof createDatabase>) {
	return buildS62AWrittenRepresentationsReadMorePage({
		db
	} as unknown as Service);
}

describe('S62A written representations read-more controller', () => {
	it('scopes the accepted representation lookup to the requested application', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-27T12:00:00.000Z') });
		const db = createDatabase(new Date('2025-03-01'));
		const response = createResponse();

		await createHandler(db)(createRequest(), response);

		assert.deepStrictEqual(db.s62aRepresentation.findUnique.mock.calls[0].arguments[0].where, {
			reference: representationReference,
			applicationId,
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED
		});
		assert.strictEqual(response.render.mock.callCount(), 1);
	});

	it('allows access on the representation publish date', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-03-01T12:00:00.000Z') });
		const db = createDatabase(new Date('2025-03-01T00:00:00.000Z'));
		const response = createResponse();

		await createHandler(db)(createRequest(), response);

		assert.strictEqual(db.s62aRepresentation.findUnique.mock.callCount(), 1);
		assert.strictEqual(response.render.mock.callCount(), 1);
	});

	it('returns not found and does not query representations before the publish date', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-03-01T12:00:00.000Z') });
		const db = createDatabase(new Date('2025-03-02'));
		const request = createRequest();

		await assertRenders404Page(createHandler(db), request, false);

		assert.strictEqual(db.s62aRepresentation.findUnique.mock.callCount(), 0);
	});

	it('returns not found for an invalid application ID without querying the database', async () => {
		const db = createDatabase(new Date('2025-03-01'));
		const request = createRequest('invalid-id');

		await assertRenders404Page(createHandler(db), request, false);

		assert.strictEqual(db.s62aCase.findUnique.mock.callCount(), 0);
	});

	it('returns not found when the application is not found', async () => {
		const db = createDatabase(new Date('2025-03-01'), undefined, null);
		const request = createRequest();

		await assertRenders404Page(createHandler(db), request, false);

		assert.strictEqual(db.s62aCase.findUnique.mock.callCount(), 1);
		assert.strictEqual(db.s62aRepresentation.findUnique.mock.callCount(), 0);
	});

	it('returns not found for an invalid representation reference without querying representations', async () => {
		const db = createDatabase(new Date('2025-03-01'));
		const request = createRequest(applicationId, 'invalid-reference');

		await assertRenders404Page(createHandler(db), request, false);

		assert.strictEqual(db.s62aCase.findUnique.mock.callCount(), 1);
		assert.strictEqual(db.s62aRepresentation.findUnique.mock.callCount(), 0);
	});

	it('returns not found when the accepted representation is not found', async () => {
		const db = createDatabase(new Date('2025-03-01'), null);
		const request = createRequest();

		await assertRenders404Page(createHandler(db), request, false);

		assert.strictEqual(db.s62aRepresentation.findUnique.mock.callCount(), 1);
	});

	it('returns not found and does not query representations when no publish date is set', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-03-01T12:00:00.000Z') });
		const db = createDatabase(null);
		const request = createRequest();

		await assertRenders404Page(createHandler(db), request, false);

		assert.strictEqual(db.s62aRepresentation.findUnique.mock.callCount(), 0);
	});

	it('filters attachments to accepted documents and maps redacted and original document details', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-27T12:00:00.000Z') });
		const db = createDatabase(new Date('2025-03-01'), {
			id: 'representation-id',
			reference: representationReference,
			submittedDate: new Date('2025-01-15'),
			comment: 'Representation comment',
			commentRedacted: null,
			submittedByAgentOrgName: null,
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			representedTypeId: null,
			representedGroupName: null,
			containsAttachments: true,
			distressingContentInRepresentation: false,
			SubmittedByContact: { firstName: 'Alex', lastName: 'Example' },
			RepresentedContacts: [],
			Category: { displayName: 'General' },
			Attachments: [
				{
					id: 'document-1',
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					fileName: 'original.pdf',
					redactedBlobName: 'redacted-document-1',
					redactedFileName: 'public-version.pdf',
					size: '2048',
					mimeType: 'application/pdf'
				},
				{
					id: 'document-2',
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					fileName: 'notes.txt',
					redactedBlobName: null,
					redactedFileName: null,
					size: '1024',
					mimeType: 'text/plain'
				}
			]
		});
		const response = createResponse();

		await createHandler(db)(createRequest(), response);

		const representationQuery = db.s62aRepresentation.findUnique.mock.calls[0].arguments[0];
		assert.strictEqual(representationQuery.select.Attachments.where.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);

		const [, locals] = response.render.mock.calls[0].arguments;
		assert.deepStrictEqual(locals.documents, [
			{ id: 'document-1', name: 'public-version.pdf', size: '2 KB', type: 'PDF' },
			{ id: 'document-2', name: 'notes.txt', size: '1 KB', type: 'text/plain' }
		]);
	});
});

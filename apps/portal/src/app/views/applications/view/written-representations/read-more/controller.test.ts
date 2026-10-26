import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import { buildCrownWrittenRepresentationsReadMorePage } from './controller.ts';

const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
const representationReference = 'AAAAA-BBBBB';
const caseReference = 'CROWN/2025/0000001';

function createRequest(overrides = {}) {
	return {
		params: { applicationId, representationReference, ...overrides },
		originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
	};
}

function createApplication(overrides = {}) {
	return {
		id: applicationId,
		reference: caseReference,
		representationsPeriodStartDate: new Date('2025-01-01'),
		representationsPeriodEndDate: new Date('2025-02-01'),
		representationsPublishDate: new Date('2025-03-01'),
		containsDistressingContent: false,
		...overrides
	};
}

function createRepresentation(overrides = {}) {
	return {
		id: 1,
		reference: representationReference,
		submittedDate: new Date('2025-01-15'),
		comment: 'Representation comment',
		commentRedacted: null,
		submittedByAgentOrgName: null,
		submittedForId: 'myself',
		representedTypeId: null,
		containsAttachments: false,
		distressingContentInRepresentation: false,
		SubmittedFor: { displayName: 'Alex Example' },
		SubmittedByContact: { firstName: 'Alex', lastName: 'Example' },
		RepresentedContact: null,
		Category: { displayName: 'General' },
		Attachments: [],
		...overrides
	};
}

function createDatabase({ application = createApplication(), representation = createRepresentation() } = {}) {
	return {
		crownDevelopment: {
			findUnique: mock.fn(() => application)
		},
		representation: {
			findUnique: mock.fn(() => representation)
		},
		applicationUpdate: {
			findFirst: mock.fn(() => undefined),
			count: mock.fn(() => 0)
		}
	};
}

describe('Crown written representations read-more controller', () => {
	it('fetches the published application and accepted representation before handing off to the shared renderer', async () => {
		const db = createDatabase();
		const response = { render: mock.fn(), status: mock.fn() };
		const handler = buildCrownWrittenRepresentationsReadMorePage({
			db,
			logger: mockLogger()
		});

		await handler(createRequest(), response);

		const applicationQuery = db.crownDevelopment.findUnique.mock.calls[0].arguments[0];
		assert.strictEqual(applicationQuery.where.id, applicationId);
		assert.ok(applicationQuery.where.publishDate.lte instanceof Date);
		assert.deepStrictEqual(applicationQuery.select, {
			reference: true,
			representationsPeriodStartDate: true,
			representationsPeriodEndDate: true,
			representationsPublishDate: true,
			containsDistressingContent: true,
			withdrawnDate: true
		});

		const representationQuery = db.representation.findUnique.mock.calls[0].arguments[0];
		assert.deepStrictEqual(representationQuery.where, {
			reference: representationReference,
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED
		});
		assert.strictEqual(response.render.mock.calls[0].arguments[0], 'read-more/view.njk');
	});

	it('retrieves attachment documents using redacted IDs when available and original IDs otherwise', async () => {
		const db = createDatabase({
			representation: createRepresentation({
				containsAttachments: true,
				Attachments: [
					{ itemId: 'original-1', redactedItemId: 'redacted-1' },
					{ itemId: 'original-2', redactedItemId: null }
				]
			})
		});
		const sharePointDrive = {
			getDriveItem: mock.fn((id) => ({ id, name: `${id}.pdf`, file: { mimeType: 'application/pdf' } }))
		};
		const response = { render: mock.fn(), status: mock.fn() };
		const handler = buildCrownWrittenRepresentationsReadMorePage({
			db,
			logger: mockLogger(),
			sharePointDrive
		});

		await handler(createRequest(), response);

		assert.deepStrictEqual(
			sharePointDrive.getDriveItem.mock.calls.map((call) => call.arguments[0]),
			['redacted-1', 'original-2']
		);
		assert.strictEqual(response.render.mock.calls[0].arguments[0], 'read-more/view.njk');
	});

	it('does not fetch attachments when the representation has none', async () => {
		const db = createDatabase();
		const sharePointDrive = { getDriveItem: mock.fn() };
		const response = { render: mock.fn(), status: mock.fn() };
		const handler = buildCrownWrittenRepresentationsReadMorePage({
			db,
			logger: mockLogger(),
			sharePointDrive
		});

		await handler(createRequest(), response);

		assert.strictEqual(sharePointDrive.getDriveItem.mock.callCount(), 0);
		assert.strictEqual(response.render.mock.calls[0].arguments[0], 'read-more/view.njk');
	});

	it('warns and skips SharePoint retrieval when attachments are expected but none are accepted', async () => {
		const db = createDatabase({
			representation: createRepresentation({ containsAttachments: true, Attachments: [] })
		});
		const logger = mockLogger();
		const sharePointDrive = { getDriveItem: mock.fn() };
		const response = { render: mock.fn(), status: mock.fn() };
		const handler = buildCrownWrittenRepresentationsReadMorePage({
			db,
			logger,
			sharePointDrive
		});

		await handler(createRequest(), response);

		assert.strictEqual(sharePointDrive.getDriveItem.mock.callCount(), 0);
		assert.strictEqual(logger.warn.mock.callCount(), 1);
	});

	describe('not-found paths', () => {
		it('returns not found for an invalid application ID without querying the database', async () => {
			const db = createDatabase();
			const request = createRequest({ applicationId: 'invalid' });
			const handler = buildCrownWrittenRepresentationsReadMorePage({ db, logger: mockLogger() });

			await assertRenders404Page(handler, request, false);

			assert.strictEqual(db.crownDevelopment.findUnique.mock.callCount(), 0);
		});

		it('returns not found when the published application does not exist', async () => {
			const db = createDatabase({ application: null });
			const request = createRequest();
			const handler = buildCrownWrittenRepresentationsReadMorePage({ db, logger: mockLogger() });

			await assertRenders404Page(handler, request, false);

			assert.strictEqual(db.representation.findUnique.mock.callCount(), 0);
		});

		it('returns not found for an invalid representation reference without querying the representation', async () => {
			const db = createDatabase();
			const request = createRequest({ representationReference: 'invalid-reference' });
			const handler = buildCrownWrittenRepresentationsReadMorePage({ db, logger: mockLogger() });

			await assertRenders404Page(handler, request, false);

			assert.strictEqual(db.crownDevelopment.findUnique.mock.callCount(), 1);
			assert.strictEqual(db.representation.findUnique.mock.callCount(), 0);
		});

		it('returns not found when the accepted representation does not exist', async () => {
			const db = createDatabase({ representation: null });
			const request = createRequest();
			const handler = buildCrownWrittenRepresentationsReadMorePage({ db, logger: mockLogger() });

			await assertRenders404Page(handler, request, false);

			assert.strictEqual(db.representation.findUnique.mock.callCount(), 1);
		});
	});
});

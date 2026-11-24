import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { mockLogger } from '@planning-inspectorate/core/testing';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { representationAttachmentsFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { checkIfExpiredMiddleware } from '../utils/middleware.ts';
import { createWrittenRepresentationsRoutes } from './index.js';

const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
const representationReference = 'AAAAA-BBBBB';
const reference = 'CROWN/2025/0000001';
const baseUrl = `/applications/${applicationId}/written-representations`;
const urls = [baseUrl, `${baseUrl}/${representationReference}`, `${baseUrl}/${representationReference}/doc-123`];
const accepted = REPRESENTATION_STATUS_ID.ACCEPTED;

function setup(
	context,
	{ application: applicationOverrides, representation: representationOverrides, document: documentOverrides } = {}
) {
	context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-07-15T12:00:00Z') });
	const application = {
		id: applicationId,
		reference,
		publishDate: new Date('2025-01-01'),
		representationsPeriodStartDate: new Date('2025-01-01'),
		representationsPeriodEndDate: new Date('2025-02-01'),
		representationsPublishDate: new Date('2026-07-14'),
		withdrawnDate: null,
		...applicationOverrides
	};
	const document = {
		itemId: 'doc-123',
		redactedItemId: null,
		statusId: accepted,
		...documentOverrides
	};
	const representation = {
		id: 1,
		applicationId,
		reference: representationReference,
		statusId: accepted,
		submittedDate: new Date('2025-01-15'),
		comment: 'Public comment',
		commentRedacted: null,
		submittedForId: 'myself',
		SubmittedFor: { displayName: 'Myself' },
		SubmittedByContact: { firstName: 'Alex', lastName: 'Example' },
		RepresentedContact: null,
		Category: { displayName: 'Interested party' },
		containsAttachments: false,
		Attachments: [],
		...representationOverrides
	};
	const matchesRepresentation = (where) => Object.entries(where).every(([key, value]) => representation[key] === value);
	const db = {
		crownDevelopment: {
			findUnique: mock.fn(({ where }) =>
				where.id === application.id && application.publishDate && application.publishDate <= where.publishDate.lte
					? application
					: null
			)
		},
		representation: {
			findUnique: mock.fn(({ where }) => (matchesRepresentation(where) ? representation : null)),
			findMany: mock.fn(({ where }) => (matchesRepresentation(where) ? [representation] : [])),
			count: mock.fn(({ where }) => (matchesRepresentation(where) ? 1 : 0))
		},
		representationDocument: {
			count: mock.fn(({ where }) =>
				matchesRepresentation(where.Representation) &&
				document.statusId === where.statusId &&
				where.OR.some((condition) => Object.entries(condition).every(([key, value]) => document[key] === value))
					? 1
					: 0
			)
		},
		applicationUpdate: { count: mock.fn(() => 0) }
	};
	const sharePointDrive = {
		getDriveItem: mock.fn((id) => ({
			id,
			name: 'attachment.pdf',
			file: { mimeType: 'application/pdf' },
			parentReference: {
				path: `/drives/d1/root:/${representationAttachmentsFolderPath(reference, representationReference)}`
			}
		})),
		getDriveItemDownloadUrl: mock.fn(() => 'https://storage.example/attachment.pdf')
	};
	const fetchMock = context.mock.method(
		globalThis,
		'fetch',
		async () =>
			new Response('PDF', {
				headers: { 'Content-Type': 'application/pdf', 'Content-Length': '3' }
			})
	);
	const service = { db, sharePointDrive, logger: mockLogger(), dynamicCacheControl: { enabled: false } };
	const app = express();
	app.use((req, res, next) => {
		res.render = (view) => res.json({ view });
		next();
	});
	app.use(
		'/applications/:applicationId/written-representations',
		checkIfExpiredMiddleware(service),
		createWrittenRepresentationsRoutes(service)
	);
	return { app, db, sharePointDrive, fetchMock };
}

function assertNoStorage({ sharePointDrive, fetchMock }) {
	assert.equal(sharePointDrive.getDriveItem.mock.callCount(), 0);
	assert.equal(sharePointDrive.getDriveItemDownloadUrl.mock.callCount(), 0);
	assert.equal(fetchMock.mock.callCount(), 0);
}

describe('Crown public representation routes', () => {
	for (const date of [null, new Date('2026-07-16')]) {
		it(`should deny all three routes before publication (${date})`, async (context) => {
			const state = setup(context, { application: { representationsPublishDate: date } });
			for (const url of urls) {
				await request(state.app).get(url).expect(404);
			}
			assert.equal(state.db.representation.findMany.mock.callCount(), 0);
			assert.equal(state.db.representation.findUnique.mock.callCount(), 0);
			assert.equal(state.db.representationDocument.count.mock.callCount(), 0);
			assertNoStorage(state);
		});
	}

	for (const date of [new Date('2026-07-14'), new Date('2026-07-15'), new Date('2026-07-15T23:59:59+01:00')]) {
		it(`should allow all three routes on or after the publication day (${date.toISOString()})`, async (context) => {
			const state = setup(context, { application: { representationsPublishDate: date } });
			for (const url of urls) {
				await request(state.app).get(url).expect(200);
			}
			assert.equal(state.fetchMock.mock.callCount(), 1);
		});
	}

	for (const representation of [
		{ applicationId: 'another-application' },
		{ statusId: 'rejected' },
		{ reference: 'CCCCC-DDDDD' }
	]) {
		it(`should deny detail and attachment for a mismatched representation ${JSON.stringify(representation)}`, async (context) => {
			const state = setup(context, { representation });
			for (const url of urls.slice(1)) {
				await request(state.app).get(url).expect(404);
			}
			assertNoStorage(state);
		});
	}

	for (const application of [
		{ publishDate: null },
		{ publishDate: new Date('2026-07-16') },
		{ withdrawnDate: new Date('2025-07-14') }
	]) {
		it(`should preserve application publication and expiry guards ${JSON.stringify(application)}`, async (context) => {
			const state = setup(context, { application });
			for (const url of urls) {
				await request(state.app).get(url).expect(404);
			}
			assertNoStorage(state);
		});
	}

	it('should preserve access to withdrawn applications that have not expired', async (context) => {
		const state = setup(context, { application: { withdrawnDate: new Date('2026-07-01') } });
		for (const url of urls) {
			await request(state.app).get(url).expect(200);
		}
	});

	for (const document of [
		{ statusId: 'rejected' },
		{ itemId: 'another-document' },
		{ redactedItemId: 'redacted-123' }
	]) {
		it(`should deny attachments that fail the document policy ${JSON.stringify(document)}`, async (context) => {
			const state = setup(context, { document });
			await request(state.app).get(urls[2]).expect(404);
			assertNoStorage(state);
		});
	}

	it('should allow the redacted replacement rather than the original', async (context) => {
		const state = setup(context, { document: { redactedItemId: 'redacted-123' } });
		await request(state.app).get(`${baseUrl}/${representationReference}/redacted-123`).expect(200);
		assert.equal(state.sharePointDrive.getDriveItemDownloadUrl.mock.calls[0].arguments[0], 'redacted-123');
	});

	it('should reject malformed representation references without accessing storage', async (context) => {
		const state = setup(context);
		await request(state.app).get(`${baseUrl}/invalid`).expect(404);
		await request(state.app).get(`${baseUrl}/invalid/doc-123`).expect(404);
		assertNoStorage(state);
	});
});

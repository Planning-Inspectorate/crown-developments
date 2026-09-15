import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import type { RedactedAttachmentUploader } from './redacted-attachment-document-uploader.ts';
import { buildReviewRepresentationDocument, buildReviewDocumentDecision, buildUploadDocuments } from './controller.ts';

describe('Manage Representation Document Controllers', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const warnMock = mock.fn();

	const mockLogger = {
		info: infoMock,
		error: errorMock,
		warn: warnMock
	} as unknown as ManageService['logger'];

	const findFirstMock = mock.fn();

	const mockDb = {
		blobRepresentationDocument: { findFirst: findFirstMock }
	} as unknown as ManageService['db'];

	const service = { db: mockDb, logger: mockLogger } as unknown as ManageService;
	const MANAGE_JOURNEY_ID = 's62a-manage-reps-manage-journey';

	const mockRes = (): Response => {
		const renderMock = mock.fn();
		const statusMock = mock.fn();
		const redirectMock = mock.fn();
		const res = {
			render: renderMock,
			status: statusMock,
			redirect: redirectMock,
			send: mock.fn(),
			locals: {},
			headersSent: false
		} as unknown as Response;
		statusMock.mock.mockImplementation(() => res as unknown as undefined);
		return res;
	};

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: { representationRef: 'REP-001', documentId: 'DOC-001', id: 'CASE-123' },
			session: { files: {}, itemsToBeDeleted: {} },
			sessionID: 'test-session-123',
			originalUrl: '/cases/123/reps/REP-001/doc/DOC-001',
			baseUrl: '/cases/123/reps/REP-001/doc/DOC-001',
			path: '/',
			url: '/',
			body: {},
			files: [],
			...overrides
		}) as unknown as Request;

	beforeEach(() => {
		findFirstMock.mock.resetCalls();
		infoMock.mock.resetCalls();
		errorMock.mock.resetCalls();
		warnMock.mock.resetCalls();
	});

	describe('buildReviewRepresentationDocument', () => {
		it('should render the review document page when document exists', async () => {
			const req = mockReq();
			const res = mockRes();
			const handler = buildReviewRepresentationDocument(service);

			findFirstMock.mock.mockImplementation(
				() => Promise.resolve({ fileName: 'test-doc.pdf' }) as unknown as undefined
			);

			await handler(req, res, mock.fn() as unknown as undefined);

			assert.strictEqual(findFirstMock.mock.callCount(), 1);

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(renderMock.mock.callCount(), 1);

			const renderArgs = renderMock.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'views/cases/view/manage-reps/review/review-document.njk');

			const viewData = renderArgs[1] as Record<string, unknown>;
			assert.strictEqual(viewData.fileName, 'test-doc.pdf');
			assert.strictEqual(viewData.reference, 'REP-001');
			assert.strictEqual(viewData.acceptAndRedact, ACCEPT_AND_REDACT);
		});

		it('should call notFoundHandler if document does not exist', async () => {
			const req = mockReq();
			const res = mockRes();
			const handler = buildReviewRepresentationDocument(service);

			findFirstMock.mock.mockImplementation(() => Promise.resolve(null) as unknown as undefined);

			await handler(req, res, mock.fn() as unknown as undefined);

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(renderMock.mock.callCount(), 1);
		});
	});

	describe('buildReviewDocumentDecision', () => {
		const deleteDraftMock = mock.fn();
		const mockUploader = {
			deleteDraft: deleteDraftMock
		} as unknown as RedactedAttachmentUploader;

		beforeEach(() => {
			deleteDraftMock.mock.resetCalls();
		});

		it('should re-render with errors if reviewDocumentDecision is missing', async () => {
			const req = mockReq({ body: {} });
			const res = mockRes();
			const handler = buildReviewDocumentDecision(service, MANAGE_JOURNEY_ID, mockUploader);

			findFirstMock.mock.mockImplementation(
				() => Promise.resolve({ fileName: 'test-doc.pdf' }) as unknown as undefined
			);

			await handler(req, res);

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(renderMock.mock.callCount(), 1);

			const renderArgs = renderMock.mock.calls[0].arguments;
			const viewData = renderArgs[1] as Record<string, Record<string, unknown>>;
			assert.ok(viewData.errors);
			assert.ok(viewData.errors.reviewDocumentDecision);

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 0);
		});

		it('should redirect to redact page if decision is ACCEPT_AND_REDACT', async () => {
			const req = mockReq({ body: { reviewDocumentDecision: ACCEPT_AND_REDACT } });
			const res = mockRes();
			const handler = buildReviewDocumentDecision(service, MANAGE_JOURNEY_ID, mockUploader);

			await handler(req, res);

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 1);
			assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/cases/123/reps/REP-001/doc/DOC-001/redact');
		});

		it('should redirect to task list and cleanup session when accepting standard document in other journey', async () => {
			const req = mockReq({
				body: { reviewDocumentDecision: REPRESENTATION_STATUS_ID.ACCEPTED },
				session: {
					files: {
						'REP-001': {
							'DOC-001': {
								uploadedFiles: [{ itemId: 'redacted-id-1', fileName: 'redacted.pdf' }]
							}
						}
					}
				}
			});
			const res = mockRes();

			const handler = buildReviewDocumentDecision(service, 'other-journey', mockUploader);
			await handler(req, res);

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 1);
			assert.strictEqual(deleteDraftMock.mock.callCount(), 1);

			const session = req.session as unknown as Record<string, Record<string, Record<string, unknown>>>;
			const docSession = session.files['REP-001']['DOC-001'] as Record<string, unknown>;
			assert.notStrictEqual(docSession.uploadedFiles, []);
		});
	});

	describe('buildUploadDocuments', () => {
		it('should process uploads, save to session, and redirect to redact', async () => {
			const processMock = mock.fn();
			const mockUploader = {
				processAndDraftUploads: processMock
			} as unknown as RedactedAttachmentUploader;

			const req = mockReq({
				files: [{ originalname: 'test.pdf', size: 1000 }]
			});
			const res = mockRes();

			processMock.mock.mockImplementation(
				() =>
					Promise.resolve([
						{ blobName: 'blob-1', fileName: 'test.pdf', mimeType: 'application/pdf', size: 1000 }
					]) as unknown as undefined
			);

			const handler = buildUploadDocuments(mockUploader);
			await handler(req, res);

			assert.strictEqual(processMock.mock.callCount(), 1);

			const session = req.session as unknown as Record<string, Record<string, Record<string, unknown>>>;
			const docSession = session.files['REP-001']['DOC-001'] as Record<string, Array<unknown>>;
			const uploadedFiles = docSession.uploadedFiles;

			assert.strictEqual(uploadedFiles.length, 1);
			assert.deepStrictEqual(uploadedFiles[0], {
				itemId: 'blob-1',
				fileName: 'test.pdf',
				mimeType: 'application/pdf',
				size: 1000
			});

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 1);
			assert.strictEqual(
				redirectMock.mock.calls[0].arguments[0],
				'/s62a/cases/CASE-123/manage-representations/REP-001/review/task-list/DOC-001/redact'
			);
		});
	});
});

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import { buildRepresentationTaskList, buildReviewRepresentationSubmission } from './controller.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('Representation Controllers', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const warnMock = mock.fn();

	const mockLogger = {
		info: infoMock,
		error: errorMock,
		warn: warnMock
	} as unknown as ManageService['logger'];

	const findUniqueMock = mock.fn();
	const updateMock = mock.fn();
	const findManyDraftsMock = mock.fn();
	const deleteManyDraftsMock = mock.fn();
	const deleteBlobIfExistsMock = mock.fn();

	const mockDb = {
		s62aRepresentation: { findUnique: findUniqueMock, update: updateMock },
		s62aRepresentationItem: { update: updateMock, findMany: mock.fn() },
		s62aCase: { update: updateMock },
		draftBlobRepresentationDocument: { findMany: findManyDraftsMock, deleteMany: deleteManyDraftsMock },
		$transaction: mock.fn(async (arg) => {
			if (Array.isArray(arg)) {
				return Promise.all(arg);
			}
			return arg(mockDb);
		})
	} as unknown as ManageService['db'];

	const mockBlobStore = {
		deleteBlobIfExists: deleteBlobIfExistsMock
	} as unknown as ManageService['blobStore'];

	const service = { db: mockDb, logger: mockLogger, blobStore: mockBlobStore } as unknown as ManageService;

	const MANAGE_JOURNEY_ID = 's62a-manage-reps-manage-journey';
	const OTHER_JOURNEY_ID = 'other-journey';

	const mockRes = (): Response => {
		const renderMock = mock.fn();
		const statusMock = mock.fn();
		const redirectMock = mock.fn();
		const res = {
			render: renderMock,
			status: statusMock,
			send: mock.fn(),
			redirect: redirectMock,
			locals: {}
		} as unknown as Response;
		statusMock.mock.mockImplementation(() => res as unknown as undefined);
		return res;
	};

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: { id: '123', representationRef: 'REP-001' },
			session: { sessionID: 'session-123' },
			originalUrl: '/cases/123/reps/REP-001',
			baseUrl: '/cases/123/reps/REP-001',
			path: '/',
			url: '/',
			...overrides
		}) as unknown as Request;

	beforeEach(() => {
		findUniqueMock.mock.resetCalls();
		updateMock.mock.resetCalls();
		findManyDraftsMock.mock.resetCalls();
		deleteManyDraftsMock.mock.resetCalls();
		deleteBlobIfExistsMock.mock.resetCalls();
		(mockDb.$transaction as unknown as ReturnType<typeof mock.fn>).mock.resetCalls();
		infoMock.mock.resetCalls();
		errorMock.mock.resetCalls();
		warnMock.mock.resetCalls();
	});

	describe('buildRepresentationTaskList', () => {
		describe('Early Exits & Error Handling', () => {
			it('should trigger notFound logic if representation is not found', async () => {
				const req = mockReq();
				const res = mockRes();
				const handler = buildRepresentationTaskList(service, MANAGE_JOURNEY_ID);

				findUniqueMock.mock.mockImplementation(() => Promise.resolve(null) as unknown as undefined);

				await handler(req, res, mock.fn() as unknown as undefined);

				assert.strictEqual(findUniqueMock.mock.callCount(), 1);

				const renderCalls = (res.render as unknown as ReturnType<typeof mock.fn>).mock.calls;
				if (renderCalls.length > 0) {
					assert.notStrictEqual(
						renderCalls[0].arguments[0],
						'views/s62a/cases/view/manage-reps/task-list/task-list.njk'
					);
				}
			});
		});

		describe('Journey Logic', () => {
			it('should initialize itemsToBeDeleted in session for the manage journey', async () => {
				const req = mockReq();
				const res = mockRes();
				const handler = buildRepresentationTaskList(service, MANAGE_JOURNEY_ID);

				findUniqueMock.mock.mockImplementation(
					() =>
						Promise.resolve({
							id: 'rep-1',
							reference: 'REP-001',
							statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
							containsAttachments: false,
							Attachments: []
						}) as unknown as undefined
				);

				await handler(req, res, mock.fn() as unknown as undefined);

				const session = req.session as unknown as Record<string, Record<string, unknown>>;
				assert.ok(session.itemsToBeDeleted);
				assert.deepStrictEqual(session.itemsToBeDeleted['REP-001'], []);
			});

			it('should not initialize itemsToBeDeleted for other journeys', async () => {
				const req = mockReq();
				const res = mockRes();
				const handler = buildRepresentationTaskList(service, OTHER_JOURNEY_ID);

				findUniqueMock.mock.mockImplementation(
					() =>
						Promise.resolve({
							id: 'rep-1',
							reference: 'REP-001',
							statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
							containsAttachments: false,
							Attachments: []
						}) as unknown as undefined
				);

				await handler(req, res, mock.fn() as unknown as undefined);

				const session = req.session as unknown as Record<string, Record<string, unknown>>;
				assert.strictEqual(session.itemsToBeDeleted, undefined);
			});
		});

		describe('Attachments Handling', () => {
			it('should log a warning if containsAttachments is true but Attachments array is empty', async () => {
				const req = mockReq();
				const res = mockRes();
				const handler = buildRepresentationTaskList(service, MANAGE_JOURNEY_ID);

				findUniqueMock.mock.mockImplementation(
					() =>
						Promise.resolve({
							id: 'rep-123',
							reference: 'REP-001',
							statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
							containsAttachments: true,
							Attachments: []
						}) as unknown as undefined
				);

				await handler(req, res, mock.fn() as unknown as undefined);

				assert.strictEqual(warnMock.mock.callCount(), 1);
				const warnArgs = warnMock.mock.calls[0].arguments;
				assert.deepStrictEqual(warnArgs[0], { representationRef: 'REP-001', representationId: 'rep-123' });
			});

			it('should map documents correctly when attachments are present', async () => {
				const req = mockReq();
				const res = mockRes();
				const handler = buildRepresentationTaskList(service, MANAGE_JOURNEY_ID);

				findUniqueMock.mock.mockImplementation(
					() =>
						Promise.resolve({
							id: 'rep-123',
							reference: 'REP-001',
							statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
							containsAttachments: true,
							Attachments: [
								{
									fileName: 'test-doc.pdf',
									id: '12345678',
									statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
								}
							]
						}) as unknown as undefined
				);

				await handler(req, res, mock.fn() as unknown as undefined);

				const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
				assert.strictEqual(renderMock.mock.callCount(), 1);

				const viewData = renderMock.mock.calls[0].arguments[1] as Record<string, unknown>;
				const documents = viewData.documents as Array<{ title: { text: string }; href: string }>;

				assert.strictEqual(documents.length, 1);
				assert.strictEqual(documents[0].title.text, 'test-doc.pdf');
				assert.strictEqual(documents[0].href, '/cases/123/reps/REP-001/12345678');
			});
		});

		describe('Session Initialization', () => {
			it('should setup files and reviewDecisions session state', async () => {
				const req = mockReq();
				const res = mockRes();
				const handler = buildRepresentationTaskList(service, MANAGE_JOURNEY_ID);

				findUniqueMock.mock.mockImplementation(
					() =>
						Promise.resolve({
							id: 'rep-1',
							reference: 'REP-001',
							statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
							commentRedacted: false,
							containsAttachments: true,
							Attachments: [
								{
									fileName: 'test-doc.pdf',
									id: 'blob-123',
									redactedBlobName: 'redacted-blob',
									redactedFileName: 'redacted-file.pdf',
									statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
								}
							]
						}) as unknown as undefined
				);

				await handler(req, res, mock.fn() as unknown as undefined);

				const session = req.session as unknown as Record<string, Record<string, unknown>>;

				assert.ok(session.files);
				const filesSession = session.files['REP-001'] as Record<string, unknown>;
				assert.ok(filesSession['blob-123']);

				assert.ok(session.reviewDecisions);
				const reviewSession = session.reviewDecisions['REP-001'] as Record<string, unknown>;
				assert.ok(reviewSession.comment);
				assert.ok(reviewSession['blob-123']);
			});
		});
	});

	describe('buildReviewRepresentationSubmission', () => {
		it('should process submission, clear session properties, and redirect without attachments', async () => {
			const req = mockReq({
				session: {
					reviewDecisions: { 'REP-001': { comment: { reviewDecision: 'accepted' } } },
					files: { 'REP-001': {} },
					itemsToBeDeleted: { 'REP-001': [] }
				}
			});
			const res = mockRes();
			const handler = buildReviewRepresentationSubmission(service);

			updateMock.mock.mockImplementation(() => Promise.resolve() as unknown as undefined);

			await handler(req, res, mock.fn() as unknown as undefined);

			assert.strictEqual((mockDb.$transaction as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
			assert.strictEqual(findManyDraftsMock.mock.callCount(), 0);
			assert.strictEqual(deleteBlobIfExistsMock.mock.callCount(), 0);

			const session = req.session as unknown as Record<string, unknown>;
			assert.notStrictEqual(session.reviewDecisions, {});
			assert.notStrictEqual(session.files, {});
			assert.notStrictEqual(session.itemsToBeDeleted, {});

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 1);
		});

		it('should process submission, remove draft redactions and delete blobs', async () => {
			const req = mockReq({
				sessionID: 'session-123',
				session: {
					reviewDecisions: { 'REP-001': { comment: { reviewDecision: 'accepted' } } },
					files: {
						'REP-001': {
							'attachment-1': { uploadedFiles: [{ itemId: 'blob-1', fileName: 'file1.pdf' }] }
						}
					},
					itemsToBeDeleted: { 'REP-001': ['blob-to-delete'] }
				}
			});
			const res = mockRes();
			const handler = buildReviewRepresentationSubmission(service);

			findManyDraftsMock.mock.mockImplementation(() => Promise.resolve([{ id: 'draft-1' }]) as unknown as undefined);
			deleteManyDraftsMock.mock.mockImplementation(() => Promise.resolve() as unknown as undefined);
			deleteBlobIfExistsMock.mock.mockImplementation(() => Promise.resolve() as unknown as undefined);

			await handler(req, res, mock.fn() as unknown as undefined);

			assert.strictEqual((mockDb.$transaction as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);

			assert.strictEqual(findManyDraftsMock.mock.callCount(), 1);
			assert.deepStrictEqual(findManyDraftsMock.mock.calls[0].arguments[0], {
				select: { id: true },
				where: { sessionKey: 'session-123', blobName: { in: ['blob-1'] } }
			});

			assert.strictEqual(deleteManyDraftsMock.mock.callCount(), 1);
			assert.deepStrictEqual(deleteManyDraftsMock.mock.calls[0].arguments[0], {
				where: { id: { in: ['draft-1'] } }
			});

			assert.strictEqual(deleteBlobIfExistsMock.mock.callCount(), 1);
			assert.strictEqual(deleteBlobIfExistsMock.mock.calls[0].arguments[0], 'blob-to-delete');

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 1);
		});

		it('should abort draft deletion logic if count mismatch occurs', async () => {
			const req = mockReq({
				session: {
					sessionID: 'session-123',
					files: {
						'REP-001': {
							'attachment-1': { uploadedFiles: [{ itemId: 'blob-1', fileName: 'file1.pdf' }] },
							'attachment-2': { uploadedFiles: [{ itemId: 'blob-2', fileName: 'file2.pdf' }] }
						}
					}
				}
			});
			const res = mockRes();
			const handler = buildReviewRepresentationSubmission(service);

			findManyDraftsMock.mock.mockImplementation(() => Promise.resolve([{ id: 'draft-1' }]) as unknown as undefined);

			await handler(req, res, mock.fn() as unknown as undefined);

			assert.strictEqual(warnMock.mock.callCount(), 1);
			assert.strictEqual(warnMock.mock.calls[0].arguments[0], 'Incorrect number of drafts found, aborting.');
			assert.strictEqual(deleteManyDraftsMock.mock.callCount(), 0);
		});

		it('should abort draft deletion logic if NO drafts are found', async () => {
			const req = mockReq({
				session: {
					sessionID: 'session-123',
					files: {
						'REP-001': {
							'attachment-1': { uploadedFiles: [{ itemId: 'blob-1', fileName: 'file1.pdf' }] }
						}
					}
				}
			});
			const res = mockRes();
			const handler = buildReviewRepresentationSubmission(service);

			findManyDraftsMock.mock.mockImplementation(() => Promise.resolve([]) as unknown as undefined);

			await handler(req, res, mock.fn() as unknown as undefined);

			assert.strictEqual(warnMock.mock.callCount(), 1);
			assert.strictEqual(warnMock.mock.calls[0].arguments[0], 'No draft records found matching the session files.');
			assert.strictEqual(deleteManyDraftsMock.mock.callCount(), 0);
		});

		it('should throw an error if removeDraftRedactions catches a database error', async () => {
			const req = mockReq({
				session: {
					sessionID: 'session-123',
					files: {
						'REP-001': {
							'attachment-1': { uploadedFiles: [{ itemId: 'blob-1', fileName: 'file1.pdf' }] }
						}
					}
				}
			});
			const res = mockRes();
			const handler = buildReviewRepresentationSubmission(service);

			findManyDraftsMock.mock.mockImplementation(() => {
				throw new Error('Database connection failed');
			});

			await assert.rejects(
				() => handler(req, res, mock.fn() as unknown as undefined),
				(err: Error) => {
					assert.strictEqual(err.message, 'Failed to move representation attachments: Database connection failed');
					return true;
				}
			);

			assert.strictEqual(errorMock.mock.callCount(), 2);
		});
	});
});

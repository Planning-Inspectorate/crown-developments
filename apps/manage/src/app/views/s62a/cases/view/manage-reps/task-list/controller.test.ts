import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import { buildRepresentationTaskList } from './controller.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('buildRepresentationTaskList', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const warnMock = mock.fn();

	const mockLogger = {
		info: infoMock,
		error: errorMock,
		warn: warnMock
	} as unknown as ManageService['logger'];

	const findUniqueMock = mock.fn();

	const mockDb = {
		s62aRepresentation: { findUnique: findUniqueMock }
	} as unknown as ManageService['db'];

	const service = { db: mockDb, logger: mockLogger } as unknown as ManageService;
	const MANAGE_JOURNEY_ID = 's62a-manage-reps-manage-journey';
	const OTHER_JOURNEY_ID = 'other-journey';

	const mockRes = (): Response => {
		const renderMock = mock.fn();
		const statusMock = mock.fn();
		const res = {
			render: renderMock,
			status: statusMock,
			send: mock.fn(),
			locals: {}
		} as unknown as Response;
		statusMock.mock.mockImplementation(() => res as unknown as undefined);
		return res;
	};

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: { representationRef: 'REP-001' },
			session: {},
			originalUrl: '/cases/123/reps/REP-001',
			baseUrl: '/cases/123/reps/REP-001',
			path: '/',
			url: '/',
			...overrides
		}) as unknown as Request;

	beforeEach(() => {
		findUniqueMock.mock.resetCalls();
		infoMock.mock.resetCalls();
		errorMock.mock.resetCalls();
		warnMock.mock.resetCalls();
	});

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
				assert.notStrictEqual(renderCalls[0].arguments[0], 'views/s62a/cases/view/manage-reps/task-list/task-list.njk');
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
								blobName: 'blob-123',
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
			assert.strictEqual(documents[0].href, '/cases/123/reps/REP-001/blob-123');
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
								blobName: 'blob-123',
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

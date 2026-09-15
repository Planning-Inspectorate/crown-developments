import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';
import { buildValidateRepresentationMiddleware, buildValidateRedactedFileMiddleware } from './validation-middleware.ts';

describe('Representation Middlewares', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const warnMock = mock.fn();

	const mockLogger = {
		info: infoMock,
		error: errorMock,
		warn: warnMock
	} as unknown as ManageService['logger'];

	const findUniqueRepMock = mock.fn(async (..._args: any[]): Promise<any> => null);
	const findManyBlobMock = mock.fn(async (..._args: any[]): Promise<any[]> => []);
	const findUniqueBlobMock = mock.fn(async (..._args: any[]): Promise<any> => null);
	const findFirstBlobMock = mock.fn(async (..._args: any[]): Promise<any> => null);
	const findManyDraftMock = mock.fn(async (..._args: any[]): Promise<any[]> => []);

	const mockDb = {
		s62aRepresentation: {
			findUnique: findUniqueRepMock
		},
		blobRepresentationDocument: {
			findMany: findManyBlobMock,
			findUnique: findUniqueBlobMock,
			findFirst: findFirstBlobMock
		},
		draftBlobRepresentationDocument: {
			findMany: findManyDraftMock
		}
	} as unknown as ManageService['db'];

	const service = { db: mockDb, logger: mockLogger } as unknown as ManageService;

	const mockRes = (): Response => {
		const res = {
			render: mock.fn(),
			redirect: mock.fn(),
			status: mock.fn(() => res),
			send: mock.fn(),
			locals: {}
		};
		return res as unknown as Response;
	};

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: { id: 'CASE-123', representationRef: 'REP-001', documentId: 'DOC-001' },
			sessionID: 'test-session-123',
			session: { files: {} },
			baseUrl: '/cases/123/reps/REP-001',
			body: {},
			files: [],
			...overrides
		}) as unknown as Request;

	beforeEach(() => {
		findUniqueRepMock.mock.resetCalls();
		findManyBlobMock.mock.resetCalls();
		findUniqueBlobMock.mock.resetCalls();
		findFirstBlobMock.mock.resetCalls();
		findManyDraftMock.mock.resetCalls();
		infoMock.mock.resetCalls();
	});

	describe('buildValidateRepresentationMiddleware', () => {
		it('should call notFoundHandler if representation is not found', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRepresentationMiddleware(service);

			findUniqueRepMock.mock.mockImplementation(async (..._args: any[]) => null);

			await handler(req, res, next);

			assert.strictEqual(findUniqueRepMock.mock.callCount(), 1);

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 0);
		});

		it('should redirect with errors in session if validation fails', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRepresentationMiddleware(service);

			findUniqueRepMock.mock.mockImplementation(async (..._args: any[]) => ({
				reference: 'REP-001',
				SubmittedByContact: null,
				RepresentedContacts: []
			}));

			await handler(req, res, next);

			const session = req.session as unknown as Record<string, Record<string, unknown>>;
			assert.ok(session.representations);
			assert.ok((session.representations['REP-001'] as Record<string, unknown>).errors);

			const redirectMock = res.redirect as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(redirectMock.mock.callCount(), 1);
			assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/cases/123/reps/REP-001');

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 0);
		});
	});

	describe('buildValidateRedactedFileMiddleware', () => {
		beforeEach(() => {
			findFirstBlobMock.mock.mockImplementation(async (..._args: any[]) => ({
				statusId: 1,
				fileName: 'original-doc.pdf',
				redactedBlobName: null,
				redactedFileName: null
			}));
		});

		it('should call notFoundHandler if the target document does not exist', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRedactedFileMiddleware(service);

			findUniqueBlobMock.mock.mockImplementation(async (..._args: any[]) => null);

			await handler(req, res, next);

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 0);
		});

		it('should set an error and render if uploaded file matches the original attachment name', async () => {
			const req = mockReq({
				files: [{ originalname: 'original-doc.pdf' }]
			});
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRedactedFileMiddleware(service);

			findUniqueBlobMock.mock.mockImplementation(async (..._args: any[]) => ({ fileName: 'original-doc.pdf' }));

			await handler(req, res, next);

			const body = req.body as Record<string, Record<string, Record<string, string>>>;
			assert.ok(body.errors);
			assert.strictEqual(body.errors['upload-form'].msg, 'Original attachment has the same name');

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(renderMock.mock.callCount(), 1);

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 0);
		});

		it('should set an error and render if uploaded file matches another attachment in the representation', async () => {
			const req = mockReq({
				files: [{ originalname: 'other-attachment.pdf' }]
			});
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRedactedFileMiddleware(service);

			findUniqueBlobMock.mock.mockImplementation(async (..._args: any[]) => ({ fileName: 'original-doc.pdf' }));
			findManyBlobMock.mock.mockImplementation(async (..._args: any[]) => [{ fileName: 'other-attachment.pdf' }]);

			await handler(req, res, next);

			const body = req.body as Record<string, Record<string, Record<string, string>>>;
			assert.ok(body.errors);
			assert.strictEqual(body.errors['upload-form'].msg, 'An attachment with this name has already been uploaded');

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 0);
		});

		it('should set an error and render if uploaded file matches a draft redacted file', async () => {
			const req = mockReq({
				files: [{ originalname: 'draft-redacted.pdf' }]
			});
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRedactedFileMiddleware(service);

			findUniqueBlobMock.mock.mockImplementation(async (..._args: any[]) => ({ fileName: 'original-doc.pdf' }));
			findManyDraftMock.mock.mockImplementation(async (..._args: any[]) => [{ fileName: 'draft-redacted.pdf' }]);

			await handler(req, res, next);

			const body = req.body as Record<string, Record<string, Record<string, string>>>;
			assert.ok(body.errors);
			assert.strictEqual(
				body.errors['upload-form'].msg,
				'A redacted attachment with this name has already been uploaded'
			);

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 0);
		});

		it('should call next() if there are no duplicate files', async () => {
			const req = mockReq({
				files: [{ originalname: 'new-redacted-file.pdf' }]
			});
			const res = mockRes();
			const next = mock.fn() as unknown as NextFunction;
			const handler = buildValidateRedactedFileMiddleware(service);

			findUniqueBlobMock.mock.mockImplementation(async (..._args: any[]) => ({ fileName: 'original-doc.pdf' }));
			findManyBlobMock.mock.mockImplementation(async (..._args: any[]) => [{ fileName: 'other-attachment.pdf' }]);
			findManyDraftMock.mock.mockImplementation(async (..._args: any[]) => [{ fileName: 'draft-redacted.pdf' }]);

			await handler(req, res, next);

			const nextMock = next as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(nextMock.mock.callCount(), 1);

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(renderMock.mock.callCount(), 0);
		});
	});
});

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DocumentUnpublisher, type UnpublishRequestBody } from './document-unpublisher.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

type MockResponse = {
	redirect: ReturnType<typeof mock.fn>;
	render: ReturnType<typeof mock.fn>;
	headersSent: boolean;
};

type MockRequest = {
	body: Partial<UnpublishRequestBody>;
	params: ParamsDictionary;
	originalUrl: string;
	session: Record<string, any>;
};

describe('DocumentUnpublisher', () => {
	let mockService: ManageService;
	let mockReq: MockRequest;
	let mockRes: MockResponse;
	let unpublisher: DocumentUnpublisher;

	beforeEach(() => {
		mockService = {
			logger: {
				error: mock.fn()
			},
			db: {
				document: {
					findMany: mock.fn(async () => [
						{ id: 'doc-1', fileName: 'test-1.pdf' },
						{ id: 'doc-2', fileName: 'test-2.pdf' }
					]),
					updateMany: mock.fn(async () => ({ count: 2 }))
				}
			}
		} as unknown as ManageService;

		mockReq = {
			body: {},
			params: { id: 'case-1' },
			originalUrl: '/s62a/cases/case-1/unpublish/documents/confirmation',
			session: {}
		};

		mockRes = {
			redirect: mock.fn(),
			render: mock.fn(),
			headersSent: false
		};

		unpublisher = new DocumentUnpublisher(mockService);
	});

	describe('renderConfirmation (GET)', () => {
		it('redirects to safe return url if no files are in the session', async () => {
			mockReq.session.unpublishFileIds = [];

			await unpublisher.renderConfirmation(
				mockReq as unknown as Request<ParamsDictionary, unknown, UnpublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('renders the confirmation view with correct document data', async () => {
			mockReq.session.unpublishFileIds = ['doc-1', 'doc-2'];

			await unpublisher.renderConfirmation(
				mockReq as unknown as Request<ParamsDictionary, unknown, UnpublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const view = mockRes.render.mock.calls[0].arguments[0];
			const context = mockRes.render.mock.calls[0].arguments[1] as Record<string, any>;

			assert.strictEqual(view, 'views/s62a/cases/view/folders/util/unpublish-confirmation.njk');
			assert.strictEqual(context.documents.length, 2);
			assert.strictEqual(context.documents[0].id, 'doc-1');
			assert.strictEqual(context.pageHeading, 'Unpublish selected documents');
			assert.strictEqual(context.unpublishUrl, '/s62a/cases/case-1/unpublish/documents');
		});
	});

	describe('executeUnpublish (POST)', () => {
		it('redirects to safe return url if no files are in the session', async () => {
			mockReq.session.unpublishFileIds = [];

			await unpublisher.executeUnpublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, UnpublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('logs error and renders confirmation view with error summary on failure', async () => {
			mockReq.session.unpublishFileIds = ['doc-1'];

			const dbError = new Error('Failed to update DB');
			(mockService as any).db.document.updateMany = mock.fn(async () => {
				throw dbError;
			});

			await unpublisher.executeUnpublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, UnpublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual((mockService as any).logger.error.mock.calls.length, 1);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const context = mockRes.render.mock.calls[0].arguments[1] as Record<string, any>;

			assert.deepStrictEqual(context.errorSummary, [{ text: 'Failed to unpublish documents, please try again.' }]);
			assert.deepStrictEqual(context.documents, []);
		});

		it('updates documents, sets success data, removes session data, and redirects on success', async () => {
			mockReq.session.unpublishFileIds = ['doc-1', 'doc-2'];

			await unpublisher.executeUnpublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, UnpublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual((mockService as any).db.document.updateMany.mock.calls.length, 1);
			const updateArgs = (mockService as any).db.document.updateMany.mock.calls[0].arguments[0];

			assert.deepStrictEqual(updateArgs.where, { id: { in: ['doc-1', 'doc-2'] } });
			assert.deepStrictEqual(updateArgs.data, { publishDate: null, categoryId: null });

			assert.strictEqual(mockReq.session.unpublishFileIds, undefined);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});
	});
});

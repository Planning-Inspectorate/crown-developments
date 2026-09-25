import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DocumentPublisher, type PublishRequestBody } from './document-publisher.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

type MockResponse = {
	redirect: ReturnType<typeof mock.fn>;
	render: ReturnType<typeof mock.fn>;
	headersSent: boolean;
};

type MockRequest = {
	body: Partial<PublishRequestBody>;
	params: ParamsDictionary;
	originalUrl: string;
	session: Record<string, any>;
};

describe('DocumentPublisher', () => {
	let mockService: ManageService;
	let mockReq: MockRequest;
	let mockRes: MockResponse;
	let publisher: DocumentPublisher;

	beforeEach(() => {
		mockService = {
			logger: {
				error: mock.fn()
			},
			db: {
				document: {
					findMany: mock.fn(async () => [
						{ id: 'doc-1', publishDate: null, S62aCase: { reference: 'ref-1' } },
						{ id: 'doc-2', publishDate: null, S62aCase: { reference: 'ref-1' } }
					]),
					updateMany: mock.fn(async () => ({ count: 2 }))
				}
			}
		} as unknown as ManageService;

		mockReq = {
			body: {},
			params: { id: 'case-1' },
			originalUrl: '/s62a/cases/case-1/publish/documents',
			session: {}
		};

		mockRes = {
			redirect: mock.fn(),
			render: mock.fn(),
			headersSent: false
		};

		publisher = new DocumentPublisher(mockService);
	});

	describe('handleSelection (POST)', () => {
		it('redirects to safe url and adds validation error to session if no files selected', async () => {
			mockReq.body.selectedFiles = [];

			await publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
			assert.ok(mockReq.session);
		});

		it('redirects to provided returnUrl if no files selected and returnUrl is valid', async () => {
			mockReq.body.selectedFiles = [];
			mockReq.body.returnUrl = '/s62a/cases/case-1/custom-return';

			await publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/custom-return');
		});

		it('redirects with error if selected files are already published', async () => {
			mockReq.body.selectedFiles = ['doc-1'];

			(mockService as any).db.document.findMany = mock.fn(async () => [
				{ id: 'doc-1', publishDate: new Date(), S62aCase: { reference: 'ref-1' } }
			]);

			await publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('saves valid document IDs array to session and redirects to original url', async () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];

			await publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.publishFileIds, ['doc-1', 'doc-2']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/publish/documents');
		});

		it('normalises a single string ID into an array and saves to session', async () => {
			mockReq.body.selectedFiles = 'doc-1';

			await publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.publishFileIds, ['doc-1']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/publish/documents');
		});

		it('redirects to root (/) if originalUrl is not a valid redirect uri', async () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.originalUrl = 'https://external-malicious-site.com/publish';

			await publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/');
		});
	});

	describe('renderCategorisation (GET)', () => {
		it('redirects to safe return url if no files are in the session', async () => {
			mockReq.session.publishFileIds = [];

			await publisher.renderCategorisation(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response,
				[] as any
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('renders the categorisation view with document data', async () => {
			mockReq.session.publishFileIds = ['doc-1', 'doc-2'];

			await publisher.renderCategorisation(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response,
				[] as any
			);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const view = mockRes.render.mock.calls[0].arguments[0];
			const context = mockRes.render.mock.calls[0].arguments[1] as Record<string, any>;
			assert.strictEqual(view, 'views/s62a/cases/view/folders/folder/publish/categorisation.njk');
			assert.strictEqual(context.reference, 'ref-1');
			assert.strictEqual(context.documents.length, 2);
		});
	});

	describe('executePublish (POST)', () => {
		it('redirects to safe return url if no files are in the session', async () => {
			mockReq.session.publishFileIds = [];

			await publisher.executePublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response,
				[] as any
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('renders categorisation view with error if category is missing', async () => {
			mockReq.session.publishFileIds = ['doc-1'];
			mockReq.body.documentCategory = undefined;

			await publisher.executePublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response,
				[] as any
			);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const context = mockRes.render.mock.calls[0].arguments[1] as Record<string, any>;
			assert.deepStrictEqual(context.errorSummary, [{ text: 'Select a category', href: '#documentCategory' }]);
		});

		it('renders categorisation view with error if files are already published', async () => {
			mockReq.session.publishFileIds = ['doc-1'];
			mockReq.body.documentCategory = 'cat-1';

			(mockService as any).db.document.findMany = mock.fn(async () => [
				{ id: 'doc-1', publishDate: new Date(), S62aCase: { reference: 'ref-1' } }
			]);

			await publisher.executePublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response,
				[] as any
			);

			assert.strictEqual((mockService as any).logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const context = mockRes.render.mock.calls[0].arguments[1] as Record<string, any>;
			assert.deepStrictEqual(context.errorSummary, [
				{ text: 'Failed to publish documents, please try again.', href: '#' }
			]);
		});

		it('publishes documents, removes session data, and redirects on success', async () => {
			mockReq.session.publishFileIds = ['doc-1', 'doc-2'];
			mockReq.body.documentCategory = 'cat-1';

			await publisher.executePublish(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response,
				[] as any
			);

			assert.strictEqual((mockService as any).db.document.updateMany.mock.calls.length, 1);
			const updateCallArgs = (mockService as any).db.document.updateMany.mock.calls[0].arguments[0] as Record<
				string,
				any
			>;

			assert.deepStrictEqual(updateCallArgs.where, { id: { in: ['doc-1', 'doc-2'] } });
			assert.strictEqual(updateCallArgs.data.categoryId, 'cat-1');
			assert.ok(updateCallArgs.data.publishDate instanceof Date);

			assert.strictEqual(mockReq.session.publishFileIds, undefined);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});
	});
});

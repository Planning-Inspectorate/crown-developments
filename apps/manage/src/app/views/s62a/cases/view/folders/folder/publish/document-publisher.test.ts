import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DocumentPublisher, type PublishRequestBody } from './document-publisher.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

type MockResponse = {
	redirect: ReturnType<typeof mock.fn>;
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
		mockService = {} as ManageService;

		mockReq = {
			body: {},
			params: { id: 'case-1' },
			originalUrl: '/s62a/cases/case-1/publish/documents',
			session: {}
		};

		mockRes = {
			redirect: mock.fn()
		};

		publisher = new DocumentPublisher(mockService);
	});

	describe('handleSelection (POST)', () => {
		it('redirects to safe url and adds validation error to session if no files selected', () => {
			mockReq.body.selectedFiles = [];

			publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
			assert.ok(mockReq.session);
		});

		it('redirects to provided returnUrl if no files selected and returnUrl is valid', () => {
			mockReq.body.selectedFiles = [];
			mockReq.body.returnUrl = '/s62a/cases/case-1/custom-return';

			publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/custom-return');
		});

		it('saves valid document IDs array to session and redirects to original url', () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];

			publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.publishFileIds, ['doc-1', 'doc-2']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/publish/documents');
		});

		it('normalises a single string ID into an array and saves to session', () => {
			mockReq.body.selectedFiles = 'doc-1';

			publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.publishFileIds, ['doc-1']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/publish/documents');
		});

		it('redirects to root (/) if originalUrl is not a valid redirect uri', () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.originalUrl = 'https://external-malicious-site.com/publish';

			publisher.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, PublishRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/');
		});
	});
});

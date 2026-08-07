import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DocumentDeleter, type DeleteRequestBody } from './document-deleter.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

type MockService = {
	db: {
		document: {
			findMany: ReturnType<typeof mock.fn>;
			updateMany: ReturnType<typeof mock.fn>;
		};
	};
	logger: {
		error: ReturnType<typeof mock.fn>;
		warn: ReturnType<typeof mock.fn>;
		debug: ReturnType<typeof mock.fn>;
		info: ReturnType<typeof mock.fn>;
	};
};

type MockResponse = {
	redirect: ReturnType<typeof mock.fn>;
	render: ReturnType<typeof mock.fn>;
	status: ReturnType<typeof mock.fn>;
	send: ReturnType<typeof mock.fn>;
};

type MockRequest = {
	body: Partial<DeleteRequestBody>;
	params: ParamsDictionary;
	originalUrl: string;
	session: Record<string, any>;
};

describe('DocumentDeleter', () => {
	let mockService: MockService;
	let mockReq: MockRequest;
	let mockRes: MockResponse;
	let deleter: DocumentDeleter;

	const mockDocs = [
		{
			id: 'doc-1',
			fileName: 'test-file-1.pdf',
			s62aCaseId: 'case-1',
			Folder: { id: 'folder-1', displayName: 'Evidence' }
		},
		{
			id: 'doc-2',
			fileName: 'test-file-2.pdf',
			s62aCaseId: 'case-1',
			Folder: { id: 'folder-1', displayName: 'Evidence' }
		}
	];

	beforeEach(() => {
		mockService = {
			db: {
				document: {
					findMany: mock.fn(),
					updateMany: mock.fn()
				}
			},
			logger: {
				error: mock.fn(),
				warn: mock.fn(),
				debug: mock.fn(),
				info: mock.fn()
			}
		};

		mockReq = {
			body: {},
			params: { id: 'case-1' },
			originalUrl: '/s62a/cases/case-1/delete/documents',
			session: {}
		};

		mockRes = {
			redirect: mock.fn(),
			render: mock.fn(),
			status: mock.fn(() => mockRes),
			send: mock.fn()
		};

		deleter = new DocumentDeleter(mockService as unknown as ManageService);
	});

	describe('handleSelection (POST)', () => {
		it('redirects to safe url and adds validation error to session if no files selected', () => {
			mockReq.body.selectedFiles = [];

			deleter.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
			assert.ok(mockReq.session);
		});

		it('saves valid document IDs to session and redirects to original url', () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];

			deleter.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.deleteFilesIds, ['doc-1', 'doc-2']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/delete/documents');
		});
	});

	describe('renderConfirmation (GET)', () => {
		it('redirects to safe return url if session contains no document IDs', async () => {
			mockReq.session.deleteFilesIds = [];

			await deleter.renderConfirmation(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('renders confirmation view with document details if IDs are in session', async () => {
			mockReq.session.deleteFilesIds = ['doc-1', 'doc-2'];
			mockReq.originalUrl = '/s62a/cases/case-1/delete/documents/confirmation';
			mockService.db.document.findMany.mock.mockImplementationOnce(() => mockDocs);

			await deleter.renderConfirmation(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.render.mock.calls.length, 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments as any;

			assert.strictEqual(renderArgs[0], 'views/s62a/cases/view/folders/folder/delete/confirmation.njk');
			assert.strictEqual(renderArgs[1].pageHeading, 'Delete 2 files');
			assert.strictEqual(renderArgs[1].backLinkUrl, '/s62a/cases/case-1');
			assert.strictEqual(renderArgs[1].deleteUrl, '/s62a/cases/case-1/delete/documents');
			assert.deepStrictEqual(renderArgs[1].documents, mockDocs);
		});

		it('throws an error if database finds no documents matching IDs', async () => {
			mockReq.session.deleteFilesIds = ['doc-missing'];
			mockService.db.document.findMany.mock.mockImplementationOnce(() => []);

			await assert.rejects(
				() =>
					deleter.renderConfirmation(
						mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
						mockRes as unknown as Response
					),
				/No documents found for provided ids/
			);
		});
	});

	describe('executeDelete (POST)', () => {
		it('redirects to safe return url if session contains no document IDs', async () => {
			mockReq.session.deleteFilesIds = undefined;

			await deleter.executeDelete(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('updates documents in database, clears session IDs, and redirects', async () => {
			mockReq.session.deleteFilesIds = ['doc-1'];
			mockService.db.document.findMany.mock.mockImplementationOnce(() => [mockDocs[0]]);
			mockService.db.document.updateMany.mock.mockImplementationOnce(() => ({ count: 1 }));

			await deleter.executeDelete(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			const updateArgs = mockService.db.document.updateMany.mock.calls[0].arguments[0] as any;
			assert.deepStrictEqual(updateArgs.where.id.in, ['doc-1']);
			assert.ok(updateArgs.data.deletedAt instanceof Date);

			assert.strictEqual(mockReq.session.deleteFilesIds, undefined, 'Session IDs should be cleared');
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
		});

		it('catches database errors, logs them, and renders view with errorSummary', async () => {
			mockReq.session.deleteFilesIds = ['doc-1'];
			mockReq.originalUrl = '/s62a/cases/case-1/delete/documents/confirmation';

			mockService.db.document.findMany.mock.mockImplementationOnce(() => {
				throw new Error('Database connection lost');
			});

			await deleter.executeDelete(
				mockReq as unknown as Request<ParamsDictionary, unknown, DeleteRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.render.mock.calls.length, 1);

			const renderArgs = mockRes.render.mock.calls[0].arguments as any;
			assert.strictEqual(renderArgs[1].errorSummary[0].text, 'Failed to delete documents, please try again.');
		});
	});

	describe('handleSingleSelection (GET)', () => {
		it('puts single document ID in session and redirects to confirmation', () => {
			mockReq.params.documentId = 'doc-inline';
			mockReq.originalUrl = '/s62a/cases/case-1/delete/doc-inline';

			deleter.handleSingleSelection(mockReq as unknown as Request, mockRes as unknown as Response);

			assert.deepStrictEqual(mockReq.session.deleteFilesIds, ['doc-inline']);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/s62a/cases/case-1/delete/documents/confirmation'
			);
		});
	});
});

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BaseDocumentAction, type BaseRequestBody, type DocumentSessionKey } from './base-document-action.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';

type MockResponse = {
	redirect: ReturnType<typeof mock.fn>;
	render: ReturnType<typeof mock.fn>;
	headersSent: boolean;
};

type MockRequest = {
	body: Partial<BaseRequestBody>;
	params: ParamsDictionary;
	originalUrl: string;
	session: Record<string, any>;
};

class TestDocumentAction extends BaseDocumentAction {
	protected sessionKey: DocumentSessionKey = 'deleteFilesIds';
	protected actionName = 'delete';
	protected emptySelectionMessage = 'Select files to delete';

	public testExtractDocumentIds(rawIds: string | string[] | undefined) {
		return this.extractDocumentIds(rawIds);
	}

	public async testGetDocumentsContext<T extends Prisma.DocumentSelect>(documentIds: string[], extraSelectFields?: T) {
		return this.getDocumentsContext(documentIds, extraSelectFields);
	}

	public testGetSafeReturnUrl(req: Request<ParamsDictionary, unknown, BaseRequestBody>) {
		return this.getSafeReturnUrl(req);
	}
}

describe('BaseDocumentAction', () => {
	let mockService: ManageService;
	let mockReq: MockRequest;
	let mockRes: MockResponse;
	let actionHandler: TestDocumentAction;

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
					])
				}
			}
		} as unknown as ManageService;

		mockReq = {
			body: {},
			params: { id: 'case-1', documentId: 'doc-123' },
			originalUrl: '/s62a/cases/case-1/delete/documents',
			session: {}
		};

		mockRes = {
			redirect: mock.fn(),
			render: mock.fn(),
			headersSent: false
		};

		actionHandler = new TestDocumentAction(mockService);
	});

	describe('handleSelection (POST)', () => {
		it('redirects to safe return url and triggers session error if no files are selected', () => {
			mockReq.body.selectedFiles = [];

			actionHandler.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1');
		});

		it('saves valid document IDs array to session and redirects to original url', () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];

			actionHandler.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.deleteFilesIds, ['doc-1', 'doc-2']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/delete/documents');
		});

		it('normalises a single string ID into an array and saves to session', () => {
			mockReq.body.selectedFiles = 'doc-1';

			actionHandler.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockReq.session.deleteFilesIds, ['doc-1']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/delete/documents');
		});

		it('redirects to root (/) if originalUrl is not a valid redirect uri', () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.originalUrl = 'https://external-malicious-site.com/delete';

			actionHandler.handleSelection(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/');
		});
	});

	describe('handleSingleSelection (GET)', () => {
		it('saves the document ID from params to the session and redirects to the confirmation page', () => {
			mockReq.params = { documentId: 'doc-123' };
			mockReq.originalUrl = '/s62a/cases/case-1/delete/doc-123';

			actionHandler.handleSingleSelection(mockReq as unknown as Request, mockRes as unknown as Response);

			assert.deepStrictEqual(mockReq.session.deleteFilesIds, ['doc-123']);
			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/s62a/cases/case-1/delete/documents/confirmation'
			);
		});

		it('redirects to root (/) if the resulting confirmation url is not a valid redirect uri', () => {
			mockReq.params = { documentId: 'doc-123' };
			mockReq.originalUrl = 'https://example.com/delete/doc-123';

			actionHandler.handleSingleSelection(mockReq as unknown as Request, mockRes as unknown as Response);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/');
		});
	});

	describe('extractDocumentIds (Protected)', () => {
		it('normalises a single string into an array', () => {
			const result = actionHandler.testExtractDocumentIds('doc-1');
			assert.deepStrictEqual(result, ['doc-1']);
		});

		it('returns array as-is if already a valid string array', () => {
			const result = actionHandler.testExtractDocumentIds(['doc-1', 'doc-2']);
			assert.deepStrictEqual(result, ['doc-1', 'doc-2']);
		});

		it('filters out non-strings and empty strings', () => {
			const rawIds: any = ['doc-1', '', null, 'doc-2', undefined, 123];
			const result = actionHandler.testExtractDocumentIds(rawIds);

			assert.deepStrictEqual(result, ['doc-1', 'doc-2']);
		});

		it('returns empty array if undefined is passed', () => {
			const result = actionHandler.testExtractDocumentIds(undefined);
			assert.deepStrictEqual(result, []);
		});
	});

	describe('getDocumentsContext (Protected)', () => {
		it('returns documents successfully from DB query', async () => {
			const result = await actionHandler.testGetDocumentsContext(['doc-1', 'doc-2']);

			assert.strictEqual(result.documents.length, 2);
			assert.strictEqual(result.documents[0].fileName, 'test-1.pdf');

			const findManyMock = (mockService as any).db.document.findMany.mock;
			assert.strictEqual(findManyMock.calls.length, 1);
			assert.deepStrictEqual(findManyMock.calls[0].arguments[0].where, { id: { in: ['doc-1', 'doc-2'] } });
		});

		it('throws an error if no documents are found', async () => {
			(mockService as any).db.document.findMany = mock.fn(async () => []);

			await assert.rejects(async () => actionHandler.testGetDocumentsContext(['missing-doc']), {
				message: 'No documents found for provided ids'
			});
		});
	});

	describe('getSafeReturnUrl (Protected)', () => {
		it('uses returnUrl from body if provided and valid', () => {
			mockReq.body.returnUrl = '/s62a/cases/case-1/custom-return';

			const url = actionHandler.testGetSafeReturnUrl(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>
			);

			assert.strictEqual(url, '/s62a/cases/case-1/custom-return');
		});

		it('falls back to stripped originalUrl if body returnUrl is missing', () => {
			mockReq.body.returnUrl = undefined;
			mockReq.originalUrl = '/s62a/cases/case-1/delete/documents';

			const url = actionHandler.testGetSafeReturnUrl(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>
			);

			assert.strictEqual(url, '/s62a/cases/case-1');
		});

		it('falls back to root (/) if both returnUrl and stripped originalUrl are invalid', () => {
			mockReq.body.returnUrl = 'https://malicious.com';
			mockReq.originalUrl = 'https://malicious.com/delete/documents';

			const url = actionHandler.testGetSafeReturnUrl(
				mockReq as unknown as Request<ParamsDictionary, unknown, BaseRequestBody>
			);

			assert.strictEqual(url, '/');
		});
	});
});

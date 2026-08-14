import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { Request, RequestHandler } from 'express';
import { AjaxDocumentUploadValidator } from './ajax-document-uploader-validator.ts';
import { validationResult } from 'express-validator';

describe('AjaxDocumentUploadValidator', () => {
	let req: Partial<Request>;

	beforeEach(() => {
		req = {
			params: {
				id: '123',
				question: 'doc-upload'
			},
			session: {} as any
		};
	});

	describe('constructor', () => {
		it('should initialize with default error message', () => {
			const validator = new AjaxDocumentUploadValidator('testField');
			assert.strictEqual(validator.fieldName, 'testField');
			assert.strictEqual(validator.errorMessage, 'Upload an attachment');
		});

		it('should initialize with custom error message', () => {
			const validator = new AjaxDocumentUploadValidator('testField', 'Custom error');
			assert.strictEqual(validator.fieldName, 'testField');
			assert.strictEqual(validator.errorMessage, 'Custom error');
		});
	});

	describe('validate', () => {
		it('should fail validation when no files are uploaded', async () => {
			const validator = new AjaxDocumentUploadValidator('testField');
			const chains = validator.validate();

			await chains[0].run(req as Request);
			const result = validationResult(req as Request);

			assert.strictEqual(result.isEmpty(), false);
			assert.strictEqual(result.array()[0].msg, 'Upload an attachment');
		});

		it('should fail validation with custom error message', async () => {
			const validator = new AjaxDocumentUploadValidator('testField', 'Must provide files');
			const chains = validator.validate();

			await chains[0].run(req as Request);
			const result = validationResult(req as RequestHandler);

			assert.strictEqual(result.isEmpty(), false);
			assert.strictEqual(result.array()[0].msg, 'Must provide files');
		});
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import DocumentUploadValidator from './document-upload-validator.js';
import { validationResult } from 'express-validator';

const FIELD_NAME = 'myselfAttachments';

describe('./src/dynamic-forms/validator/document-upload-validator.js', () => {
	it('should not return an error message if documents have been uploaded', async () => {
		const req = {
			body: {
				myselfAttachments:
					'[{"id":"id-1","name":"test-pdf copy 2.pdf","mimeType":"application/pdf","size":227787},{"id":"id-2","name":"test-pdf copy 3.pdf","mimeType":"application/pdf","size":227787}]'
			}
		};
		const documentUploadValidator = new DocumentUploadValidator(FIELD_NAME);

		const errors = await _validationMappedErrors(req, documentUploadValidator);

		assert.strictEqual(Object.keys(errors).length, 0);
	});

	it('should return an error message if documents have not been uploaded', async () => {
		const req = {
			body: {
				myselfAttachments: '[]'
			}
		};
		const documentUploadValidator = new DocumentUploadValidator(FIELD_NAME);

		const errors = await _validationMappedErrors(req, documentUploadValidator);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[FIELD_NAME].msg, 'Upload an attachment');
	});
});

const _validationMappedErrors = async (req, validator) => {
	const validationRules = validator.validate();
	await Promise.all(validationRules.map((validator) => validator.run(req)));
	const errors = validationResult(req);
	return errors.mapped();
};

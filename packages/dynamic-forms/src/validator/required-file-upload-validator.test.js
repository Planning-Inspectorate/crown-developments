import { describe, it } from 'node:test';
import assert from 'node:assert';
import RequiredFileUploadValidator from './required-file-upload-validator.js';

describe('./src/dynamic-forms/validator/required-file-upload-validator.js', () => {
	describe('validate', () => {
		it('should have a rule for path featuring fieldName', () => {
			const requiredFileUploadValidator = new RequiredFileUploadValidator();

			const rule = requiredFileUploadValidator
				.validate({
					fieldName: 'test-field-name',
					documentType: {
						name: 'test-doc-type'
					}
				})
				.builder.build();

			assert.deepStrictEqual(rule.fields, ['test-field-name']);
			assert.strictEqual(!!rule.optional, false);
			assert.strictEqual(rule.stack.length, 1);
			assert.strictEqual(rule.stack[0].validator.name, 'options');
			assert.strictEqual(!!rule.stack[0].validator.negated, false);
		});

		it('should pass if file being uploaded', async () => {
			const questionObj = {
				fieldName: 'test-fieldname',
				documentType: {
					name: 'test-doc-type'
				}
			};
			const journeyResponse = {};
			const req = { files: { test: 'test123' } };

			const requiredFileUploadValidator = new RequiredFileUploadValidator();
			const validationResult = await requiredFileUploadValidator.validate(questionObj, journeyResponse).run(req);

			assert.strictEqual(validationResult.errors.length, 0);
		});

		it('should pass if no file being uploaded and file matching question document type already uploaded', async () => {
			const questionObj = {
				fieldName: 'another-test-fieldname',
				documentType: {
					name: 'test-doc-type'
				}
			};
			const uploadedFile = {
				file: 'already-uploaded',
				type: 'test-doc-type'
			};
			const journeyResponse = {
				answers: { SubmissionDocumentUpload: [uploadedFile] }
			};
			const req = { body: {} };

			const requiredFileUploadValidator = new RequiredFileUploadValidator();
			const validationResult = await requiredFileUploadValidator.validate(questionObj, journeyResponse).run(req);

			assert.strictEqual(validationResult.errors.length, 0);
		});

		it('should fail if no file being uploaded and no file matching question document type already uploaded', async () => {
			const questionObj = {
				fieldName: 'yet-another-test-fieldname',
				documentType: {
					name: 'test-doc-type'
				}
			};
			const journeyResponse = { answers: { SubmissionDocumentUpload: [] } };
			const req = { body: {} };

			const requiredFileUploadValidator = new RequiredFileUploadValidator();
			const validationResult = await requiredFileUploadValidator.validate(questionObj, journeyResponse).run(req);

			assert.strictEqual(validationResult.errors.length, 1);
		});

		it('should fail if no file being uploaded matching question doc type and all existing files matching doc type being removed', async () => {
			const questionObj = {
				fieldName: 'test-fieldname',
				documentType: {
					name: 'test-doc-type'
				}
			};

			const journeyResponse = {
				answers: {
					SubmissionDocumentUpload: [
						{
							file: 'to-be-removed',
							type: 'test-doc-type'
						},
						{
							file: 'to-be-removed-too',
							type: 'test-doc-type'
						}
					]
				}
			};
			const req = { body: {} };
			req.body.removedFiles =
				'[{"file": "to-be-removed", "type": "test-doc-type"}, {"file": "to-be-removed-too", "type": "test-doc-type"}]';
			const requiredFileUploadValidator = new RequiredFileUploadValidator();
			const validationResult = await requiredFileUploadValidator.validate(questionObj, journeyResponse).run(req);

			assert.strictEqual(validationResult.errors.length, 1);
		});

		it('should pass if existing files matching question doc type and only some being removed', async () => {
			const questionObj = {
				fieldName: 'test-fieldname',
				documentType: {
					name: 'test-doc-type'
				}
			};
			const journeyResponse = {
				answers: {
					SubmissionDocumentUpload: [
						{
							file: 'to-be-removed',
							type: 'test-doc-type'
						},
						{
							file: 'to-be-kept',
							type: 'test-doc-type'
						}
					]
				}
			};
			const req = { body: {} };
			req.body.removedFiles = '[{"file": "to-be-removed", "type": "test-doc-type"}]';

			const requiredFileUploadValidator = new RequiredFileUploadValidator();
			const validationResult = await requiredFileUploadValidator.validate(questionObj, journeyResponse).run(req);

			assert.strictEqual(validationResult.errors.length, 0);
		});
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CUSTOM_COMPONENTS } from '../index.js';
import DocumentUploadValidator from '@pins/dynamic-forms/src/validator/document-upload-validator.js';
import RepresentationAttachments from './question.js';

describe('./lib/forms/custom-components/representation-attachments/question.js', () => {
	const question = new RepresentationAttachments({
		type: CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS,
		title: 'Attachments',
		question: 'Select Attachments',
		fieldName: 'myselfAttachments',
		url: 'select-attachments',
		validators: [new DocumentUploadValidator('myselfAttachments')]
	});
	describe('RepresentationAttachmentsQuestion', () => {
		it('should create', () => {
			assert.strictEqual(question.viewFolder, 'custom-components/representation-attachments');
		});
	});
	describe('prepQuestionForRendering', () => {});
	describe('buildRenderingContext', () => {});
	describe('formatAnswerForSummary', () => {});
	describe('getDataToSave', () => {});
});

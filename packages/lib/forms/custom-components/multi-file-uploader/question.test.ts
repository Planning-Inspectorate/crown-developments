import { type Journey, type JourneyResponse, type Section } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import nunjucks from 'nunjucks';
import MultiFileUploadQuestion from './question.ts';

let mockJourney: Journey;
let mockSection: Section;
let question: MultiFileUploadQuestion;

const questionParams = {
	title: 'Upload your documents',
	question: 'Please provide supporting files',
	fieldName: 'multi_upload_field',
	dataUploadUrl: '/upload',
	dataDeleteUrl: '/delete',
	allowedFileExtensions: ['pdf', 'doc', 'docx'],
	allowedMimeTypes: ['application/pdf', 'application/msword'],
	maxFileSizeValue: 15,
	maxFileSizeString: '15MB',
	preUploadHtml: '<p>Read before uploading</p>',
	postUploadHtml: '<p>Thank you</p>',
	showUploadWarning: true
};

describe('MultiFileUploadQuestion', () => {
	beforeEach(() => {
		mockJourney = {
			baseUrl: '/mock-base-url',
			response: {
				answers: {}
			} as unknown as JourneyResponse,
			getCurrentQuestionUrl: mock.fn(() => '/mock-journey/segment/multi_upload_field'),
			getBackLink: mock.fn(() => '/back-link')
		} as unknown as Journey;

		mockSection = {
			segment: 'mock-segment'
		} as unknown as Section;

		question = new MultiFileUploadQuestion(questionParams as any);
		question.getAction = () => ({ href: '#', text: 'Change' });
	});

	afterEach(() => {
		mock.restoreAll();
	});

	describe('constructor', () => {
		it('should correctly assign custom properties', () => {
			assert.strictEqual(question.dataUploadUrl, '/upload');
			assert.strictEqual(question.dataDeleteUrl, '/delete');
			assert.deepStrictEqual(question.allowedFileExtensions, ['pdf', 'doc', 'docx']);
			assert.strictEqual(question.maxFileSizeValue, 15);
			assert.strictEqual(question.viewFolder, 'custom-components/multi-file-uploader');
		});
	});

	describe('toViewModel', () => {
		it('should format view model correctly with no draft files', () => {
			const result = question.toViewModel({
				params: {
					id: 'appeal-123',
					question: 'multi_upload_field'
				},
				section: mockSection,
				journey: mockJourney
			});

			assert.deepStrictEqual(result.question.uploadedFiles, []);
			assert.strictEqual(result.question.dataUploadUrl, '/mock-journey/segment/multi_upload_field/upload');
			assert.strictEqual(result.question.dataDeleteUrl, '/mock-journey/segment/multi_upload_field/delete');
			assert.strictEqual(result.question.preUploadHtml, '<p>Read before uploading</p>');
		});

		it('should format view model correctly with actual draft files', () => {
			const mockCustomViewData = {
				files: {
					'appeal-123': {
						multi_upload_field: {
							uploadedFiles: [
								{
									fileName: 'test-document.pdf',
									itemId: 'mock-uuid-123',
									size: 1024
								}
							]
						}
					}
				}
			};

			const result = question.toViewModel({
				params: {
					id: 'appeal-123',
					question: 'multi_upload_field'
				},
				section: mockSection,
				journey: mockJourney,
				customViewData: mockCustomViewData
			});

			assert.strictEqual(result.question.uploadedFiles.length, 1);

			const uploadedFile = result.question.uploadedFiles[0];

			assert.strictEqual(uploadedFile.originalFileName, 'test-document.pdf');
			assert.strictEqual(uploadedFile.fileName, 'mock-uuid-123');
			assert.strictEqual(uploadedFile.deleteButton.text, 'Delete');

			assert.strictEqual(
				uploadedFile.message.html,
				'<span class="moj-multi-file-upload__filename">test-document.pdf (1KB)</span>'
			);
		});
	});

	describe('formatAnswerForSummary', () => {
		beforeEach(() => {
			mock.method(nunjucks, 'render', (templatePath: string, context: any) => {
				return `mock-rendered-html: ${context.items.length} items`;
			});
		});

		it('should return "Not started" if answer is undefined or empty', () => {
			const result = question.formatAnswerForSummary(mockSection.segment, mockJourney, []);

			assert.strictEqual(result[0].key, 'Upload your documents');
			assert.strictEqual(result[0].value, 'Not started');
		});

		it('should render nunjucks template if answer contains files', () => {
			const mockFiles = [
				{ id: 'file-1', fileName: 'doc1.pdf' },
				{ itemId: 'item-2', fileName: 'doc2.pdf' }
			];

			const result = question.formatAnswerForSummary(mockSection.segment, mockJourney, mockFiles);

			const calls = (nunjucks.render as any).mock.calls;
			assert.strictEqual(calls.length, 1);
			assert.strictEqual(calls[0].arguments[0], 'custom-components/multi-file-uploader/attachments-list.njk');

			const passedContext = calls[0].arguments[1];
			assert.strictEqual(passedContext.items.length, 2);
			assert.strictEqual(passedContext.items[0].name, 'doc1.pdf');
			assert.strictEqual(passedContext.items[0].href, '/mock-base-url/document/file-1');
			assert.strictEqual(passedContext.items[1].href, '/mock-base-url/document/item-2');

			assert.strictEqual(result[0].value, 'mock-rendered-html: 2 items');
		});
	});

	describe('getDataToSave', () => {
		let mockReq: Request;
		let mockJourneyResponse: JourneyResponse;

		beforeEach(() => {
			mockReq = {
				params: {
					id: 'appeal-123',
					question: 'multi_upload_field'
				}
			} as unknown as Request;

			mockJourneyResponse = { answers: {} } as unknown as JourneyResponse;
		});

		it('should safely extract empty draft files if session data is missing', async () => {
			const result = await question.getDataToSave(mockReq, mockJourneyResponse);

			assert.deepStrictEqual(result.answers.multi_upload_field, []);
			assert.deepStrictEqual(mockJourneyResponse.answers[question.fieldName], []);
		});
	});
});

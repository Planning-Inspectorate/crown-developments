import { describe, it, beforeEach, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import MultiFileUploadQuestion from './question.ts';
import {
	type Journey,
	type JourneyResponse,
	type Section,
	type RouteParams
} from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import nunjucks from 'nunjucks';

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
			assert.strictEqual(uploadedFile.deleteButton.text, 'Remove');

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

		it('should read files kept under the application id in the S62A portal', async () => {
			const uploadedFiles = [{ itemId: 'draft-1', fileName: 'report.pdf' }];
			const req = {
				params: { applicationId: 'application-1', question: 'attachments' },
				session: { files: { 'application-1': { attachments: { uploadedFiles } } } }
			} as unknown as Request;

			const result = await question.getDataToSave(req, mockJourneyResponse);

			assert.deepStrictEqual(result.answers.multi_upload_field, uploadedFiles);
		});
	});

	describe('portal options', () => {
		it('should leave the MOJ and button defaults alone when not set', () => {
			const result = question.toViewModel({
				params: { id: 'case-1', question: 'multi_upload_field' },
				section: mockSection,
				journey: mockJourney
			});

			assert.deepStrictEqual(result.question.dropzoneAttributes, {});
			assert.strictEqual(result.question.maximumFilesPerUpload, undefined);
			assert.strictEqual(result.question.submitButtonText, undefined);
		});
		it('should pass the options to the view', () => {
			const portalQuestion = new MultiFileUploadQuestion({
				...questionParams,
				maximumFilesPerUpload: 3,
				maximumFilesPerUploadMessage: 'You can only upload 3 attachments at a time',
				dropzoneHintText: 'Drag and drop attachments here or',
				dropzoneButtonText: 'Choose attachments',
				submitButtonText: 'Continue'
			} as any);

			const result = portalQuestion.toViewModel({
				params: { applicationId: 'application-1', question: 'attachments' },
				section: mockSection,
				journey: mockJourney,
				customViewData: {
					files: {
						'application-1': { attachments: { uploadedFiles: [{ id: 'd', itemId: 'd', fileName: 'a.pdf', size: 1 }] } }
					}
				}
			});

			assert.strictEqual(result.question.uploadedFiles?.length, 1);
			assert.deepStrictEqual(result.question.dropzoneAttributes, {
				'data-dropzone-hint-text': 'Drag and drop attachments here or',
				'data-dropzone-button-text': 'Choose attachments'
			});
			assert.strictEqual(result.question.maximumFilesPerUpload, 3);
			assert.strictEqual(result.question.maximumFilesPerUploadMessage, 'You can only upload 3 attachments at a time');
			assert.strictEqual(result.question.submitButtonText, 'Continue');
		});
	});

	describe('linkFilesInSummary', () => {
		it('should list the names without links when false', () => {
			const renderSpy = mock.method(nunjucks, 'render', () => '<ol></ol>');
			const unlinked = new MultiFileUploadQuestion({ ...questionParams, linkFilesInSummary: false } as any);
			unlinked.getAction = () => ({ href: '#', text: 'Change' }) as any;

			unlinked.formatAnswerForSummary('segment', mockJourney, [{ id: 'd', itemId: 'd', fileName: 'a.pdf', size: 1 }]);

			assert.deepStrictEqual((renderSpy.mock.calls[0].arguments[1] as any).items, [{ name: 'a.pdf' }]);
		});
	});

	describe('checkForValidationErrors', () => {
		const files = {
			'case-1': { multi_upload_field: { uploadedFiles: [{ id: 'd', itemId: 'd', fileName: 'a.pdf', size: 1 }] } }
		};
		const sessionErrors = {
			errors: { multi_upload_field: { msg: 'Upload error' } },
			errorSummary: [{ text: 'Upload error', href: '#multi_upload_field' }]
		};

		function request(body: Record<string, unknown>, session: Record<string, unknown>) {
			return {
				params: { id: 'case-1', question: 'multi_upload_field' },
				originalUrl: '/case-1/upload-page',
				body,
				session
			} as unknown as Request;
		}

		it('should show upload errors from the session, keeping the uploaded files listed', () => {
			const result = question.checkForValidationErrors(
				request({}, { files, ...sessionErrors }),
				mockSection,
				mockJourney
			);

			assert.deepStrictEqual(result?.errors, sessionErrors.errors);
			assert.deepStrictEqual(result?.errorSummary, sessionErrors.errorSummary);
			assert.strictEqual((result as any).question.uploadedFiles.length, 1);
		});
		it('should prefer errors from submitting the page', () => {
			const bodyErrors = {
				errors: { multi_upload_field: { msg: 'Select an attachment to upload' } },
				errorSummary: [{ text: 'Select an attachment to upload', href: '#multi_upload_field' }]
			};

			const result = question.checkForValidationErrors(
				request(bodyErrors, { files, ...sessionErrors }),
				mockSection,
				mockJourney
			);

			assert.deepStrictEqual(result?.errorSummary, bodyErrors.errorSummary);
			assert.strictEqual((result as any).question.uploadedFiles.length, 1);
		});
		it('should return nothing without errors', () => {
			assert.strictEqual(
				question.checkForValidationErrors(request({}, { files }), mockSection, mockJourney),
				undefined
			);
		});
	});
});

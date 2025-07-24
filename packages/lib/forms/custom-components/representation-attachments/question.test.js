import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CUSTOM_COMPONENTS } from '../index.js';
import DocumentUploadValidator from '@planning-inspectorate/dynamic-forms/src/validator/document-upload-validator.js';
import RepresentationAttachments from './question.js';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../representations/question-utils.js';

describe('./lib/forms/custom-components/representation-attachments/question.js', () => {
	const question = new RepresentationAttachments({
		type: CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS,
		title: 'Attachments',
		question: 'Select Attachments',
		fieldName: 'myselfAttachments',
		url: 'select-attachments',
		allowedFileExtensions: ALLOWED_EXTENSIONS,
		allowedMimeTypes: ALLOWED_MIME_TYPES,
		maxFileSizeValue: MAX_FILE_SIZE,
		maxFileSizeString: '20MB',
		showUploadWarning: true,
		validators: [new DocumentUploadValidator('myselfAttachments')]
	});
	describe('RepresentationAttachmentsQuestion', () => {
		it('should create', () => {
			assert.strictEqual(question.viewFolder, 'custom-components/representation-attachments');
		});
	});
	describe('prepQuestionForRendering', () => {
		it('should prep attachments question for rendering  for edit', () => {
			const section = { name: 'sectionA' };
			const journey = {
				baseUrl: '/cases/123456ab-1234-1234-1234-1234567890ab/manage-representations/AAAAA-BBBBB/edit',
				response: {
					answers: {
						myselfAttachments: [
							{
								originalname: 'test-pdf.pdf',
								mimetype: 'application/pdf',
								buffer: {
									type: 'Buffer'
								},
								size: 227787
							}
						],
						submittedForId: 'myself'
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const uploadedFiles = [
				{ name: 'file1.pdf', size: 1111 },
				{ name: 'file2.pdf', size: 2222 }
			];

			const customViewData = {
				id: 'app123',
				files: {
					app123: {
						myself: {
							uploadedFiles
						}
					}
				}
			};

			const result = question.prepQuestionForRendering(section, journey, customViewData);

			assert.deepStrictEqual(result.question.value, []);
			assert.deepStrictEqual(result.uploadedFiles, uploadedFiles);
			assert.strictEqual(
				result.uploadedFilesEncoded,
				Buffer.from(JSON.stringify(uploadedFiles), 'utf-8').toString('base64')
			);
		});
		it('should prep attachments question for rendering', () => {
			const section = { name: 'sectionA' };
			const journey = {
				baseUrl: '/cases/123456ab-1234-1234-1234-1234567890ab/manage-representations/AAAAA-BBBBB/manage',
				response: {
					answers: {
						myselfAttachments: [
							{
								originalname: 'test-pdf.pdf',
								mimetype: 'application/pdf',
								buffer: {
									type: 'Buffer'
								},
								size: 227787
							}
						],
						submittedForId: 'myself'
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const uploadedFiles = [
				{ name: 'file1.pdf', size: 1111 },
				{ name: 'file2.pdf', size: 2222 }
			];

			const customViewData = {
				id: 'app123',
				files: {
					app123: {
						myself: {
							uploadedFiles
						}
					}
				}
			};

			const result = question.prepQuestionForRendering(section, journey, customViewData);

			assert.deepStrictEqual(result.question.value, [
				{
					originalname: 'test-pdf.pdf',
					mimetype: 'application/pdf',
					buffer: { type: 'Buffer' },
					size: 227787
				}
			]);
			assert.deepStrictEqual(result.uploadedFiles, uploadedFiles);
			assert.strictEqual(
				result.uploadedFilesEncoded,
				Buffer.from(JSON.stringify(uploadedFiles), 'utf-8').toString('base64')
			);
		});
	});
	describe('checkForValidationErrors', () => {
		const journey = {
			baseUrl: '',
			taskListUrl: 'task',
			journeyTemplate: 'template',
			journeyTitle: 'title',
			response: {
				answers: {
					[question.fieldName]: [{ a: 1 }]
				}
			},
			getCurrentQuestionUrl: () => {
				return 'url';
			},
			getBackLink: () => {
				return 'back';
			}
		};
		const section = {
			name: 'section-name'
		};

		it('should not return any validation errors', () => {
			const req = {
				session: {},
				body: {},
				params: { id: '123' },
				originalUrl: '/test/url'
			};

			const result = question.checkForValidationErrors(req, section, journey);
			assert.strictEqual(result, undefined);
		});
		it('should return validation errors when req.body has errors', () => {
			const req = {
				session: {},
				body: {
					errors: { field1: 'Invalid' },
					errorSummary: [{ text: 'Invalid input', href: '#field1' }]
				},
				params: { id: '456' },
				originalUrl: '/form'
			};

			const result = question.checkForValidationErrors(req, section, journey);
			assert.deepStrictEqual(result, {
				question: {
					value: [{ a: 1 }],
					question: 'Select Attachments',
					fieldName: 'myselfAttachments',
					pageTitle: 'Select Attachments',
					description: undefined,
					html: undefined,
					hint: undefined,
					interfaceType: undefined,
					autocomplete: undefined,
					allowedFileExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'doc', 'docx', 'xls', 'xlsx'],
					allowedMimeTypes: [
						'application/pdf',
						'image/png',
						'image/jpeg',
						'image/tiff',
						'application/msword',
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
						'application/vnd.ms-excel',
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					],
					maxFileSizeValue: 20971520,
					maxFileSizeString: '20MB'
				},
				answer: [{ a: 1 }],
				layoutTemplate: 'template',
				pageCaption: 'section-name',
				navigation: ['', 'back'],
				backLink: 'back',
				showBackToListLink: true,
				listLink: 'task',
				journeyTitle: 'title',
				payload: undefined,
				continueButtonText: 'Continue',
				id: '456',
				currentUrl: '/form',
				files: undefined,
				errors: { field1: 'Invalid' },
				errorSummary: [{ text: 'Invalid input', href: '#field1' }],
				uploadedFiles: [{ a: 1 }],
				uploadedFilesEncoded: 'W3siYSI6MX1d'
			});
		});
		it('should return validation errors when req.session has errors', () => {
			const req = {
				session: {
					errors: { field2: 'Required' },
					errorSummary: [{ text: 'Field is required', href: '#field2' }],
					files: ['doc.pdf']
				},
				body: {},
				params: { applicationId: '789' },
				originalUrl: '/review'
			};

			const result = question.checkForValidationErrors(req, section, journey);
			assert.deepStrictEqual(result, {
				question: {
					value: [{ a: 1 }],
					question: 'Select Attachments',
					fieldName: 'myselfAttachments',
					pageTitle: 'Select Attachments',
					description: undefined,
					html: undefined,
					hint: undefined,
					interfaceType: undefined,
					autocomplete: undefined,
					allowedFileExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'doc', 'docx', 'xls', 'xlsx'],
					allowedMimeTypes: [
						'application/pdf',
						'image/png',
						'image/jpeg',
						'image/tiff',
						'application/msword',
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
						'application/vnd.ms-excel',
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					],
					maxFileSizeValue: 20971520,
					maxFileSizeString: '20MB'
				},
				answer: [{ a: 1 }],
				layoutTemplate: 'template',
				pageCaption: 'section-name',
				navigation: ['', 'back'],
				backLink: 'back',
				showBackToListLink: true,
				listLink: 'task',
				journeyTitle: 'title',
				payload: undefined,
				continueButtonText: 'Continue',
				id: '789',
				currentUrl: '/review',
				files: ['doc.pdf'],
				errors: { field2: 'Required' },
				errorSummary: [{ text: 'Field is required', href: '#field2' }],
				uploadedFiles: [{ a: 1 }],
				uploadedFilesEncoded: 'W3siYSI6MX1d'
			});
		});
	});
	describe('formatAnswerForSummary', () => {
		it('should format files answer', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				response: {
					answers: {
						[question.fieldName]: { a: 1 }
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};
			const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

			const formattedAnswer = question.formatAnswerForSummary(section, journey, answer);

			assert.deepStrictEqual(formattedAnswer, [
				{
					action: {
						href: 'url',
						text: 'Change',
						visuallyHiddenText: 'Select Attachments'
					},
					key: 'Attachments',
					value: 'test.pdf<br>test1.pdf'
				}
			]);
		});
		it('should format redacted files answer', () => {
			const redactedAttachmentsQuestion = new RepresentationAttachments({
				type: CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS,
				title: 'Redacted attachments',
				question: 'Redacted attachments',
				fieldName: 'myselfRedactedAttachments',
				url: 'select-attachments',
				showUploadWarning: true,
				validators: []
			});
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};
			const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

			const formattedAnswer = redactedAttachmentsQuestion.formatAnswerForSummary(section, journey, answer);

			assert.deepStrictEqual(formattedAnswer, [
				{
					action: null,
					key: 'Redacted attachments',
					value: 'test.pdf<br>test1.pdf'
				}
			]);
		});
	});
	describe('getAction', () => {
		it('should format action if journey is manage-representations and status is accepted', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				journeyId: 'manage-representations',
				initialBackLink: '/view',
				response: {
					answers: {
						statusId: 'accepted'
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};
			const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

			const result = question.getAction(section, journey, answer);
			assert.deepStrictEqual(result, [
				{
					href: '/manage/task-list',
					text: 'Manage',
					visuallyHiddenText: 'Select Attachments'
				},
				{
					href: 'url',
					text: 'Add',
					visuallyHiddenText: 'Select Attachments'
				}
			]);
		});
		it('should format action with add only if journey is manage-representations and status is accepted and documents list is empty', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				journeyId: 'manage-representations',
				initialBackLink: '/view',
				response: {
					answers: {
						statusId: 'accepted'
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};

			const result = question.getAction(section, journey, []);
			assert.deepStrictEqual(result, [
				{
					href: 'url',
					text: 'Add',
					visuallyHiddenText: 'Select Attachments'
				}
			]);
		});
		it('should format action with add only if journey is manage-representations and status is accepted and documents list is undefined', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				journeyId: 'manage-representations',
				initialBackLink: '/view',
				response: {
					answers: {
						statusId: 'accepted'
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};

			const result = question.getAction(section, journey, undefined);
			assert.deepStrictEqual(result, [
				{
					href: 'url',
					text: 'Add',
					visuallyHiddenText: 'Select Attachments'
				}
			]);
		});
		it('should format action if journey is manage-representations and status is rejected', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				journeyId: 'manage-representations',
				response: {
					answers: {
						statusId: 'rejected'
					}
				},
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};
			const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

			const result = question.getAction(section, journey, answer);

			assert.strictEqual(result, null);
		});
		it('should format action if journey is manage-representations and status is neither accepted or rejected', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				journeyId: 'manage-representations',
				response: { answers: {} },
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};
			const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

			const result = question.getAction(section, journey, answer);

			assert.deepStrictEqual(result, [
				{
					href: 'url',
					text: 'Add',
					visuallyHiddenText: 'Select Attachments'
				}
			]);
		});
		it('should format action if journey is not manage-representations', () => {
			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				journeyId: 'add-representation',
				response: { answers: {} },
				getCurrentQuestionUrl: () => {
					return 'url';
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const section = {
				name: 'section-name'
			};
			const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

			const result = question.getAction(section, journey, answer);

			assert.deepStrictEqual(result, {
				href: 'url',
				text: 'Change',
				visuallyHiddenText: 'Select Attachments'
			});
		});
	});
	describe('getDataToSave', () => {
		it('should prepare data to be saved', async () => {
			const req = {
				params: { id: 'app123' },
				session: {
					files: {
						app123: {
							myself: {
								uploadedFiles: [
									{ name: 'doc1.pdf', size: 12345 },
									{ name: 'doc2.pdf', size: 67890 }
								]
							}
						}
					}
				}
			};

			const journeyResponse = {
				answers: {
					submittedForId: 'myself'
				}
			};

			const expectedFiles = [
				{ name: 'doc1.pdf', size: 12345 },
				{ name: 'doc2.pdf', size: 67890 }
			];

			const result = await question.getDataToSave(req, journeyResponse);

			assert.deepStrictEqual(result, {
				answers: { [question.fieldName]: expectedFiles }
			});
			assert.deepStrictEqual(journeyResponse.answers[question.fieldName], expectedFiles);
		});
	});
});

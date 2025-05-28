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
	describe('prepQuestionForRendering', () => {
		it('should prep attachments question for rendering', () => {
			const section = { name: 'sectionA' };
			const journey = {
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
			assert.strictEqual(result.uploadedFilesJson, JSON.stringify(uploadedFiles));
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
					value: { a: 1 },
					question: 'Select Attachments',
					fieldName: 'myselfAttachments',
					pageTitle: 'Select Attachments',
					description: undefined,
					html: undefined,
					hint: undefined,
					interfaceType: undefined,
					autocomplete: undefined
				},
				answer: { a: 1 },
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
				uploadedFiles: [],
				uploadedFilesJson: '[]'
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
					value: { a: 1 },
					question: 'Select Attachments',
					fieldName: 'myselfAttachments',
					pageTitle: 'Select Attachments',
					description: undefined,
					html: undefined,
					hint: undefined,
					interfaceType: undefined,
					autocomplete: undefined
				},
				answer: { a: 1 },
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
				uploadedFiles: [],
				uploadedFilesJson: '[]'
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
			const answer = [{ name: 'test.pdf' }, { name: 'test1.pdf' }];

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

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { uploadDocumentQuestion } from './upload-document-middleware.js';

describe('upload-document-middleware.js', () => {
	describe('uploadDocumentQuestion', () => {
		it('should delete session errors and errorSummary if present and question is select-attachments', async () => {
			const checkForValidationErrorsMock = mock.fn();
			const mockReq = {
				params: {
					question: 'select-attachments'
				},
				session: {
					errors: [{ message: 'errors!' }],
					errorSummary: [{ message: 'errorSummary!' }]
				}
			};
			const mockRes = {
				locals: {
					journey: {
						sections: [],
						isComplete: () => true,
						getSection: mock.fn(() => 'section'),
						getQuestionBySectionAndName: mock.fn(() => {
							return {
								checkForValidationErrors: checkForValidationErrorsMock,
								renderAction: mock.fn()
							};
						})
					},
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'yes'
						}
					}
				}
			};

			await uploadDocumentQuestion(mockReq, mockRes);

			assert.strictEqual(mockReq.session.errors, undefined);
			assert.strictEqual(mockReq.session.errorSummary, undefined);

			assert.strictEqual(checkForValidationErrorsMock.mock.callCount(), 1);
		});
		it('should call prepQuestionForRendering if no errors in req.session', async () => {
			const prepQuestionForRenderingMock = mock.fn();
			const mockReq = {
				params: {
					question: 'select-attachments'
				},
				session: {}
			};
			const mockRes = {
				locals: {
					journey: {
						sections: [],
						isComplete: () => true,
						getSection: mock.fn(() => 'section'),
						getQuestionBySectionAndName: mock.fn(() => {
							return {
								prepQuestionForRendering: prepQuestionForRenderingMock,
								renderAction: mock.fn()
							};
						})
					},
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'yes'
						}
					}
				}
			};

			await uploadDocumentQuestion(mockReq, mockRes);

			assert.strictEqual(prepQuestionForRenderingMock.mock.callCount(), 1);
		});
		it('should not delete session errors and errorSummary if present and question is NOT select-attachments', async () => {
			const mockReq = {
				params: {
					question: 'full-name'
				},
				session: {
					errors: [{ message: 'errors!' }],
					errorSummary: [{ message: 'errorSummary!' }]
				}
			};

			await uploadDocumentQuestion(mockReq, {}, mock.fn());

			assert.deepStrictEqual(mockReq.session.errors, [{ message: 'errors!' }]);
			assert.deepStrictEqual(mockReq.session.errorSummary, [{ message: 'errorSummary!' }]);
		});
		it('should redirect to task list if the section is missing', async () => {
			const prepQuestionForRenderingMock = mock.fn();
			const mockReq = {
				params: {
					question: 'select-attachments'
				},
				session: {}
			};
			const mockRes = {
				locals: {
					journey: {
						sections: [],
						taskListUrl: '/task-list',
						isComplete: () => true,
						getSection: mock.fn(() => null),
						getQuestionBySectionAndName: mock.fn(() => {
							return {
								prepQuestionForRendering: prepQuestionForRenderingMock,
								renderAction: mock.fn()
							};
						})
					},
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'yes'
						}
					}
				},
				redirect: mock.fn()
			};

			await uploadDocumentQuestion(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/task-list');
		});
		it('should redirect to task list if the question is missing', async () => {
			const mockReq = {
				params: {
					question: 'select-attachments'
				},
				session: {}
			};
			const mockRes = {
				locals: {
					journey: {
						sections: [],
						taskListUrl: '/task-list',
						isComplete: () => true,
						getSection: mock.fn(() => 'section'),
						getQuestionBySectionAndName: mock.fn(() => null)
					},
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'yes'
						}
					}
				},
				redirect: mock.fn()
			};

			await uploadDocumentQuestion(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/task-list');
		});
	});
});

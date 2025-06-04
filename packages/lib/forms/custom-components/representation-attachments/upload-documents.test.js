import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { deleteDocumentsController, uploadDocumentsController } from './upload-documents.js';
import { getDriveItemsByPathData } from '@pins/crowndev-sharepoint/src/fixtures/sharepoint.js';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../representations/question-utils.js';

describe('upload-documents.js', () => {
	describe('uploadDocumentsController', () => {
		it('should successfully upload document from portal app', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			let redirectCalledWith;
			const req = {
				params: { id: '166c1754-f7dd-440a-b6f1-0f535ea008d5' },
				sessionID: 'session123',
				files: [file],
				session: {},
				body: {}
			};
			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'have-your-say',
						answers: { submittedForId: 'myself' }
					}
				},
				redirect: (url) => (redirectCalledWith = url)
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => getDriveItemsByPathData.value,
				addNewFolder: async () => mock.fn(),
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: async () => ({ uploadUrl: 'http://upload' })
			};

			const mockLogger = {
				info: mock.fn(),
				error: mock.fn()
			};

			const controller = uploadDocumentsController(
				{
					db: mockDb,
					logger: mockLogger,
					sharePointDrive,
					appName: 'portal'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/applications/166c1754-f7dd-440a-b6f1-0f535ea008d5/have-your-say/myself/select-attachments'
			);
		});
		it('should successfully upload document from manage app', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			let redirectCalledWith;
			const req = {
				params: { id: '166c1754-f7dd-440a-b6f1-0f535ea008d5' },
				sessionID: 'session123',
				files: [file],
				session: {},
				body: {}
			};
			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'add-representation',
						answers: { submittedForId: 'myself' }
					}
				},
				redirect: (url) => (redirectCalledWith = url)
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => getDriveItemsByPathData.value,
				addNewFolder: async () => mock.fn(),
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: async () => ({ uploadUrl: 'http://upload' })
			};

			const mockLogger = {
				info: mock.fn(),
				error: mock.fn()
			};

			const controller = uploadDocumentsController(
				{
					db: mockDb,
					logger: mockLogger,
					getSharePointDrive: () => sharePointDrive,
					appName: 'manage'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/cases/166c1754-f7dd-440a-b6f1-0f535ea008d5/manage-representations/add-representation/myself/select-attachments'
			);
		});
		it('should return error messages when total size of files in folder exceeds 1GB and file already exists in folder', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			let redirectCalledWith;
			const req = {
				params: { id: '166c1754-f7dd-440a-b6f1-0f535ea008d5' },
				sessionID: 'session123',
				files: [file],
				session: {},
				body: {}
			};
			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'have-your-say',
						answers: { submittedForId: 'myself' }
					}
				},
				redirect: (url) => (redirectCalledWith = url)
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => [
					{ name: 'test4.pdf', size: 4123456678 },
					{ name: 'test5.pdf', size: 6123456678 }
				],
				addNewFolder: async () => mock.fn(),
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: async () => ({ uploadUrl: 'http://upload' })
			};

			const mockLogger = {
				info: mock.fn(),
				error: mock.fn()
			};

			const controller = uploadDocumentsController(
				{
					db: mockDb,
					logger: mockLogger,
					sharePointDrive,
					appName: 'portal'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/applications/166c1754-f7dd-440a-b6f1-0f535ea008d5/have-your-say/myself/select-attachments'
			);
			assert.deepStrictEqual(req.session.errors, { 'upload-form': { msg: 'Errors encountered during file upload' } });
			assert.deepStrictEqual(req.session.errorSummary, [
				{
					text: 'Attachment with this name has already been uploaded',
					href: '#upload-form'
				},
				{
					text: 'Total file size of all attachments must be smaller than 1GB',
					href: '#upload-form'
				}
			]);
		});
		it('should return error messages when more than 3 files are in req.files', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			let redirectCalledWith;
			const req = {
				params: { id: '166c1754-f7dd-440a-b6f1-0f535ea008d5' },
				sessionID: 'session123',
				files: [file, file, file, file],
				session: {},
				body: {}
			};
			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'have-your-say',
						answers: { submittedForId: 'on-behalf-of' }
					}
				},
				redirect: (url) => (redirectCalledWith = url)
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => [{ name: 'test5.pdf', size: 123456 }],
				addNewFolder: async () => mock.fn(),
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: async () => ({ uploadUrl: 'http://upload' })
			};

			const mockLogger = {
				info: mock.fn(),
				error: mock.fn()
			};

			const controller = uploadDocumentsController(
				{
					db: mockDb,
					logger: mockLogger,
					sharePointDrive,
					appName: 'portal'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/applications/166c1754-f7dd-440a-b6f1-0f535ea008d5/have-your-say/agent/select-attachments'
			);
			assert.deepStrictEqual(req.session.errors, { 'upload-form': { msg: 'Errors encountered during file upload' } });
			assert.deepStrictEqual(req.session.errorSummary, [
				{
					text: 'You can only upload up to 3 files at a time',
					href: '#upload-form'
				}
			]);
		});
		it('should throw error if error thrown on large upload session', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 4 * 1024 * 1024 + 1
			};
			const req = {
				params: { id: '166c1754-f7dd-440a-b6f1-0f535ea008d5' },
				sessionID: 'sessionError',
				files: [file],
				session: {},
				body: {}
			};
			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'have-your-say',
						answers: { submittedForId: 'myself' }
					}
				},
				redirect: () => {}
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const mockLogger = {
				info: mock.fn(),
				error: mock.fn()
			};

			const sharePointDrive = {
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: async () => {
					throw new Error('Simulated upload session error');
				},
				getItemsByPath: () => [
					{ originalname: 'file1.pdf', size: 1024 },
					{ originalname: 'file2.pdf', size: 1024 }
				],
				addNewFolder: async () => mock.fn()
			};

			const controller = uploadDocumentsController(
				{
					db: mockDb,
					logger: mockLogger,
					sharePointDrive,
					appName: 'portal'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			try {
				await controller(req, res);
				assert.fail('Expected upload error to be thrown');
			} catch (err) {
				assert.strictEqual(err.message, 'Failed to upload file: test4.pdf');
			}
		});
		it('should throw error if application id is not provided', async () => {
			const req = {
				params: {},
				sessionID: 'sessionError',
				session: {},
				body: {}
			};

			const controller = uploadDocumentsController(
				{
					db: {},
					logger: {},
					sharePointDrive: {},
					appName: 'portal'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			try {
				await controller(req, {});
				assert.fail('Expected upload error to be thrown');
			} catch (err) {
				assert.strictEqual(err.message, 'id param required');
			}
		});
		it('should throw error if application id is not valid uuid', async () => {
			const req = {
				params: { id: 'case123' },
				sessionID: 'sessionError',
				session: {},
				body: {}
			};

			const res = {
				status: mock.fn(),
				render: mock.fn()
			};

			const controller = uploadDocumentsController(
				{
					db: {},
					logger: {},
					sharePointDrive: {},
					appName: 'portal'
				},
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await controller(req, res);

			const renderArgs = res.render.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'views/layouts/error');
			assert.deepStrictEqual(renderArgs[1], {
				pageTitle: 'Page not found',
				messages: [
					'If you typed the web address, check it is correct.',
					'If you pasted the web address, check you copied the entire address.'
				]
			});
		});
	});
	describe('deleteDocumentsController', () => {
		it('should successfully delete document from portal app', async () => {
			const mockLogger = {
				error: mock.fn()
			};

			const mockSharePointDrive = {
				deleteDocumentById: () => mock.fn()
			};

			const req = {
				params: {
					id: 'app456',
					documentId: 'doc123'
				},
				session: {
					files: {
						app456: {
							myself: {
								uploadedFiles: [
									{ id: 'doc123', name: 'to-delete.pdf' },
									{ id: 'doc999', name: 'keep.pdf' }
								]
							}
						}
					}
				}
			};

			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'have-your-say',
						answers: {
							submittedForId: 'myself'
						}
					}
				},
				redirect: (url) => {
					redirectCalledWith = url;
				}
			};

			let redirectCalledWith;

			const controller = deleteDocumentsController({
				logger: mockLogger,
				appName: 'portal',
				sharePointDrive: mockSharePointDrive
			});

			await controller(req, res);

			assert.strictEqual(redirectCalledWith, '/applications/app456/have-your-say/myself/select-attachments');
			assert.deepStrictEqual(req.session.files.app456.myself.uploadedFiles, [
				{
					id: 'doc999',
					name: 'keep.pdf'
				}
			]);
		});
		it('should successfully delete document from manage app', async () => {
			const mockLogger = {
				error: mock.fn()
			};

			const mockSharePointDrive = {
				deleteDocumentById: () => mock.fn()
			};

			const req = {
				params: {
					id: 'app456',
					documentId: 'doc123'
				},
				session: {
					files: {
						app456: {
							myself: {
								uploadedFiles: [
									{ id: 'doc123', name: 'to-delete.pdf' },
									{ id: 'doc999', name: 'keep.pdf' }
								]
							}
						}
					}
				}
			};

			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'add-representation',
						answers: {
							submittedForId: 'myself'
						}
					}
				},
				redirect: (url) => {
					redirectCalledWith = url;
				}
			};

			let redirectCalledWith;

			const controller = deleteDocumentsController({
				logger: mockLogger,
				appName: 'manage',
				sharePointDrive: mockSharePointDrive
			});

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/cases/app456/manage-representations/add-representation/myself/select-attachments'
			);
			assert.deepStrictEqual(req.session.files.app456.myself.uploadedFiles, [
				{
					id: 'doc999',
					name: 'keep.pdf'
				}
			]);
		});
		it('should throw an error if one is thrown from sharepoint', async () => {
			const mockLogger = {
				error: mock.fn()
			};

			const mockSharePointDrive = {
				deleteDocumentById: async () => {
					throw new Error('Simulated deletion failure');
				}
			};

			const req = {
				params: {
					id: 'app456',
					documentId: 'doc123'
				},
				session: {
					files: {
						app456: {
							myself: {
								uploadedFiles: [
									{ id: 'doc123', name: 'to-delete.pdf' },
									{ id: 'doc999', name: 'keep.pdf' }
								]
							}
						}
					}
				}
			};

			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'have-your-say',
						answers: {
							submittedForId: 'myself'
						}
					}
				}
			};

			const controller = deleteDocumentsController({
				logger: mockLogger,
				sharePointDrive: mockSharePointDrive
			});

			try {
				await controller(req, res);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'Failed to delete file');
			}

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
		});
	});
});

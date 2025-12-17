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
				'have-your-say',
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
				'add-representation',
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
		it('should successfully upload document from manage app for withdraw reps journey', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			let redirectCalledWith;
			const req = {
				params: { id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', representationRef: 'ABCDE-12345' },
				sessionID: 'session123',
				files: [file],
				session: {},
				body: {}
			};
			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'withdraw-representation-view',
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
				'withdraw-representation-view',
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/cases/166c1754-f7dd-440a-b6f1-0f535ea008d5/manage-representations/ABCDE-12345/view/withdraw-representation/withdraw/upload-request'
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
				'have-your-say',
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
				'have-your-say',
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
		it('should return error messages when unable to create path', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
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
				redirect: mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => [{ name: 'test5.pdf', size: 123456 }],
				addNewFolder: async () => {
					const err = new Error('Simulated failure');
					err.statusCode = 500;
					throw err;
				},
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
				'have-your-say',
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await assert.rejects(() => controller(req, res), {
				message: 'Failed to create SharePoint folder: System folder'
			});
		});
		it('should successfully upload if folders already exist', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
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
				redirect: mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => [{ name: 'test5.pdf', size: 123456 }],
				addNewFolder: async () => {
					const err = new Error('Simulated failure');
					err.statusCode = 409;
					throw err;
				},
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
				'have-your-say',
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE
			);

			await assert.doesNotReject(() => controller(req, res));
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
				'have-your-say',
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
		it('should handle large documents uploads correctly', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const originalFetch = global.fetch;
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					status: 200,
					json: async () => ({})
				})
			);
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 4 * 1024 * 1024 + 1
			};
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
				redirect: () => mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => [],
				addNewFolder: async () => mock.fn(),
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: mock.fn(() => {
					return {
						uploadUrl: 'http://upload'
					};
				})
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
				'have-your-say',
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE,
				3,
				`You can only upload up to 3 files at a time`
			);

			await assert.doesNotReject(() => controller(req, res));
			assert.strictEqual(global.fetch.mock.callCount(), 1);
			global.fetch = originalFetch;
		});
		it('should throw an error if fetch fails during large upload', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const originalFetch = global.fetch;
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					status: 500,
					json: async () => ({})
				})
			);
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 4 * 1024 * 1024 + 1
			};
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
				redirect: () => mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: '166c1754-f7dd-440a-b6f1-0f535ea008d5', reference: 'CROWN/2025/00001' }))
				}
			};

			const sharePointDrive = {
				getItemsByPath: () => [],
				addNewFolder: async () => mock.fn(),
				uploadDocumentToFolder: async () => mock.fn(),
				createLargeDocumentUploadSession: mock.fn(() => {
					return {
						uploadUrl: 'http://upload'
					};
				})
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
				'have-your-say',
				ALLOWED_EXTENSIONS,
				ALLOWED_MIME_TYPES,
				MAX_FILE_SIZE,
				3,
				`You can only upload up to 3 files at a time`
			);

			await assert.rejects(() => controller(req, res), { message: 'Failed to upload file: test4.pdf' });

			global.fetch = originalFetch;
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
									{ itemId: 'doc123', fileName: 'to-delete.pdf' },
									{ itemId: 'doc999', fileName: 'keep.pdf' }
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

			const controller = deleteDocumentsController(
				{
					logger: mockLogger,
					appName: 'portal',
					sharePointDrive: mockSharePointDrive
				},
				'have-your-say'
			);

			await controller(req, res);

			assert.strictEqual(redirectCalledWith, '/applications/app456/have-your-say/myself/select-attachments');
			assert.deepStrictEqual(req.session.files.app456.myself.uploadedFiles, [
				{
					itemId: 'doc999',
					fileName: 'keep.pdf'
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
									{ itemId: 'doc123', fileName: 'to-delete.pdf' },
									{ itemId: 'doc999', fileName: 'keep.pdf' }
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

			const controller = deleteDocumentsController(
				{
					logger: mockLogger,
					appName: 'manage',
					sharePointDrive: mockSharePointDrive
				},
				'add-representation'
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/cases/app456/manage-representations/add-representation/myself/select-attachments'
			);
			assert.deepStrictEqual(req.session.files.app456.myself.uploadedFiles, [
				{
					itemId: 'doc999',
					fileName: 'keep.pdf'
				}
			]);
		});
		it('should successfully delete document from manage app for withdraw reps journey', async () => {
			const mockLogger = {
				error: mock.fn()
			};

			const mockSharePointDrive = {
				deleteDocumentById: () => mock.fn()
			};

			const req = {
				params: {
					id: 'app456',
					representationRef: 'ABCDE-12345',
					documentId: 'doc123'
				},
				session: {
					files: {
						'ABCDE-12345': {
							withdraw: {
								uploadedFiles: [
									{ itemId: 'doc123', fileName: 'to-delete.pdf' },
									{ itemId: 'doc999', fileName: 'keep.pdf' }
								]
							}
						}
					}
				}
			};

			const res = {
				locals: {
					journeyResponse: {
						journeyId: 'withdraw-representation',
						answers: {}
					}
				},
				redirect: (url) => {
					redirectCalledWith = url;
				}
			};

			let redirectCalledWith;

			const controller = deleteDocumentsController(
				{
					logger: mockLogger,
					appName: 'manage',
					sharePointDrive: mockSharePointDrive
				},
				'withdraw-representation-review'
			);

			await controller(req, res);

			assert.strictEqual(
				redirectCalledWith,
				'/cases/app456/manage-representations/ABCDE-12345/review/withdraw-representation/withdraw/upload-request'
			);
			assert.deepStrictEqual(req.session.files['ABCDE-12345']['withdraw'].uploadedFiles, [
				{
					itemId: 'doc999',
					fileName: 'keep.pdf'
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

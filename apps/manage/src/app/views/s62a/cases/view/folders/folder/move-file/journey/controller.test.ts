import { mockLogger } from '@planning-inspectorate/core/testing';
import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import {
	buildListController,
	buildLoadCaseData,
	buildSaveController,
	moveFilesTransaction,
	validateRequestState
} from './controller.ts';

describe('Move Files Controller', () => {
	let mockReq: any, mockRes: any, mockNext: any, mockDb: any, mockService: any, recordedAudits: any[];

	const mockDbData = (dbMock: any, data: any) => dbMock.mock.mockImplementation(async () => data);

	beforeEach(() => {
		recordedAudits = [];
		mockReq = { params: { id: 'case-123' }, session: {}, locals: {} };
		mockRes = { locals: {}, redirect: mock.fn(), status: mock.fn(() => ({ send: mock.fn() })), render: mock.fn() };
		mockNext = mock.fn();

		mockDb = {
			s62aCase: { findUnique: mock.fn() },
			folder: { findUnique: mock.fn() },
			document: { updateMany: mock.fn(), findMany: mock.fn(async () => []) },
			$transaction: mock.fn(async (cb) => await cb(mockDb))
		};

		mockService = {
			db: mockDb,
			logger: mockLogger(),
			audit: {
				recordMany: async (entries: any[]) => {
					recordedAudits.push(...entries);
				}
			}
		};
	});

	describe('buildLoadCaseData', () => {
		it('should throw if id is missing', async () => {
			delete mockReq.params.id;
			await assert.rejects(
				() => buildLoadCaseData(mockService)(mockReq, mockRes, mockNext) as any,
				/id must be a single string value/
			);
		});

		it('should call notFoundHandler if case is not found', async () => {
			mockDbData(mockDb.s62aCase.findUnique, null);
			await buildLoadCaseData(mockService)(mockReq, mockRes, mockNext);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
		});

		it('should attach folderStructure to req and call next() on success', async () => {
			mockDbData(mockDb.s62aCase.findUnique, {
				id: 'case-123',
				Folders: [
					{ id: 'f1', displayName: 'Folder 1', parentFolderId: null },
					{ id: 'f2', displayName: 'Folder 2', parentFolderId: 'f1' }
				]
			});

			await buildLoadCaseData(mockService)(mockReq, mockRes, mockNext);
			assert.strictEqual(mockReq.folderStructure[0].children.length, 1);
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
	});

	describe('validateRequestState', () => {
		it('should throw if journeyResponse is missing', () => {
			assert.throws(() => validateRequestState(mockReq, mockRes, 'c-1', 'j-1', mockService.logger), /Valid journey/);
		});

		it('should redirect and clear session if no file IDs are in session', () => {
			mockRes.locals.journeyResponse = { answers: {} };
			validateRequestState(mockReq, mockRes, 'case-1', 'journey-1', mockService.logger);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/case-folders');
		});

		it('should throw if no destination folder is selected in answers', () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: null } };
			mockReq.session.moveFilesIds = ['file-1'];
			assert.throws(
				() => validateRequestState(mockReq, mockRes, 'case-1', 'journey-1', mockService.logger),
				/No destination folder/
			);
		});

		it('should return payload if state is valid', () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-1' } };
			mockReq.session.moveFilesIds = ['file-1'];
			assert.deepStrictEqual(validateRequestState(mockReq, mockRes, 'c-1', 'j-1', mockService.logger), {
				fileIds: ['file-1'],
				destinationFolderId: 'dest-1'
			});
		});
	});

	describe('moveFilesTransaction', () => {
		it('should throw if target folder does not exist or belongs to different case', async () => {
			mockDbData(mockDb.folder.findUnique, null);
			await assert.rejects(
				() => moveFilesTransaction(mockDb, 'c-1', 'f-x', ['f-1'], mockService.logger),
				/Target folder f-x not found/
			);

			mockDbData(mockDb.folder.findUnique, { id: 'f-x', s62aCaseId: 'DIFF-CASE' });
			await assert.rejects(
				() => moveFilesTransaction(mockDb, 'c-1', 'f-x', ['f-1'], mockService.logger),
				/does not belong to the current case/
			);
		});

		it('should update documents if validation passes', async () => {
			mockDbData(mockDb.folder.findUnique, { id: 'folder-x', s62aCaseId: 'case-1' });
			mockDbData(mockDb.document.updateMany, { count: 2 });
			await moveFilesTransaction(mockDb, 'case-1', 'folder-x', ['file-1', 'file-2'], mockService.logger);

			const args = mockDb.document.updateMany.mock.calls[0].arguments[0];
			assert.deepStrictEqual(args.where.id.in, ['file-1', 'file-2']);
			assert.strictEqual(args.data.folderId, 'folder-x');
		});
	});

	describe('buildListController', () => {
		it('should render correctly', async () => {
			mockReq.baseUrl = '/s62a/cases/case-123/case-folders/folder-1/folder-x/move-files/move';
			await assert.doesNotReject(() => buildListController(mock.fn(async () => {}))(mockReq, mockRes, mockNext) as any);
		});
	});

	describe('buildSaveController', () => {
		beforeEach(() => {
			mockReq.params = { id: 'case-123', folderId: 'folder-123', folderName: 'folder-name' };
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session = { moveFilesIds: ['file-1'], account: { localAccountId: 'user-999' } };

			mockDbData(mockDb.folder.findUnique, {
				id: 'dest-folder-id',
				s62aCaseId: 'case-123',
				displayName: 'Target',
				Documents: []
			});
			mockDbData(mockDb.document.updateMany, { count: 1 });
		});

		['id', 'folderId', 'folderName'].forEach((param) => {
			it(`should throw if ${param} is missing`, async () => {
				delete mockReq.params[param];
				await assert.rejects(
					() => buildSaveController(mockService)(mockReq, mockRes, mockNext) as any,
					new RegExp(`${param} must be a single string value`)
				);
			});
		});

		it('should successfully move files and redirect to the new folder url', async () => {
			mockDbData(mockDb.document.findMany, [
				{ id: 'file-1', fileName: 'report.pdf', Folder: { displayName: 'Old Folder' } }
			]);
			await buildSaveController(mockService)(mockReq, mockRes, mockNext);

			assert.strictEqual(mockReq.session.moveFilesIds, undefined);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/s62a/cases/case-123/case-folders/dest-folder-id/target'
			);

			assert.strictEqual(recordedAudits.length, 1);
			assert.strictEqual(recordedAudits[0].metadata.fileName, 'report.pdf');
			assert.strictEqual(recordedAudits[0].metadata.oldFolderName, 'Old Folder');
			assert.strictEqual(recordedAudits[0].metadata.folderName, 'Target');
		});

		it('should throw if target folder not found or belongs to wrong case', async () => {
			mockDb.folder.findUnique.mock.mockImplementationOnce(async () => ({
				id: 'dest-folder-id',
				s62aCaseId: 'case-123'
			}));
			mockDb.folder.findUnique.mock.mockImplementationOnce(async () => null);
			await assert.rejects(() => buildSaveController(mockService)(mockReq, mockRes, mockNext) as any);

			mockDbData(mockDb.folder.findUnique, { id: 'dest-folder-id', s62aCaseId: 'wrong-case', Documents: [] });
			await assert.rejects(
				() => buildSaveController(mockService)(mockReq, mockRes, mockNext) as any,
				/does not belong to the current case/
			);
		});

		it('should use fallback dash (-) when folder names are missing', async () => {
			mockDbData(mockDb.document.findMany, [{ id: 'file-1', fileName: 'orphan.pdf', Folder: null }]);
			mockDb.$transaction.mock.mockImplementation(async (cb: any) => {
				await cb(mockDb);
				return { id: 'dest-folder-id', displayName: null };
			});
			mockDbData(mockDb.folder.findUnique, {
				id: 'dest-folder-id',
				s62aCaseId: 'case-123',
				displayName: null,
				Documents: []
			});

			try {
				await buildSaveController(mockService)(mockReq, mockRes, mockNext);
			} catch {}

			assert.strictEqual(recordedAudits[0].metadata.oldFolderName, '-');
			assert.strictEqual(recordedAudits[0].metadata.folderName, '-');
		});

		it('should add an error to the session and redirect if there is a fileName conflict', async () => {
			mockDbData(mockDb.document.findMany, [{ id: 'file-1', fileName: 'doc.pdf' }]);
			mockDbData(mockDb.folder.findUnique, {
				id: 'dest-folder-id',
				s62aCaseId: 'case-123',
				displayName: 'Target',
				Documents: [{ fileName: 'doc.pdf' }]
			});

			await buildSaveController(mockService)(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(mockReq.session['move-files']['case-123'].moveFileErrors, [
				{ text: 'doc.pdf: File with this name already exists in the folder', href: '#' }
			]);
		});
	});
});

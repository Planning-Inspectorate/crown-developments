import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import type { CaseDataModel } from '@pins/crowndev-lib/util/types.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { DocumentDeleter } from '../view/folders/folder/delete/document-deleter.ts';
import { createDocumentsController } from '../view/folders/folder/upload/upload-documents/controller.ts';
import type { DocumentsUploader } from '../view/folders/folder/upload/upload-documents/document-uploader.ts';
import { DocumentDownloader } from '../view/folders/util/document-downloader.ts';

/**
 * Checks each S62A file action is recorded in the case history.
 */

function buildService(db: Record<string, unknown> = {}) {
	// Typed like the real recordMany, so the recorded arguments are typed too
	const recordMany = mock.fn<(entries: AuditEntry[], dataModel: CaseDataModel) => Promise<void>>(async () => {});
	const service = {
		db,
		audit: { recordMany },
		logger: { info: mock.fn(), warn: mock.fn(), error: mock.fn(), debug: mock.fn() },
		blobStore: {},
		createZipArchive: () => ({})
	} as unknown as ManageService;

	return { service, recordMany };
}

const session = { account: { localAccountId: 'user-1' } };

describe('S62A file auditing', () => {
	describe('upload', () => {
		function runUpload(fileNames: string[]) {
			const { service, recordMany } = buildService({
				folder: { findUnique: mock.fn(async () => ({ displayName: "Applicant's documents" })) }
			});
			const uploader = {
				commitDrafts: mock.fn(async () => ({ createdLength: fileNames.length, fileNames }))
			} as unknown as DocumentsUploader;

			const req = {
				params: { id: 'case-1', folderId: 'folder-1' },
				baseUrl: '/s62a/cases/case-1/case-folders/folder-1/applicants-documents/upload',
				sessionID: 'session-1',
				session
			} as unknown as Request;
			const res = { redirect: mock.fn() } as unknown as Response;

			return { recordMany, run: () => createDocumentsController(service, uploader)(req, res) };
		}

		it('should record a single upload with the folder name', async () => {
			const { recordMany, run } = runUpload(['Site map.pdf']);

			await run();

			assert.deepStrictEqual(recordMany.mock.calls[0].arguments, [
				[
					{
						caseId: 'case-1',
						userId: 'user-1',
						action: SHARED_AUDIT_ACTIONS.FILE_UPLOADED,
						metadata: { folderName: "Applicant's documents", fileName: 'Site map.pdf' }
					}
				],
				CASE_DATA_MODEL.S62A
			]);
		});

		it('should record several uploads as one bulk entry', async () => {
			const { recordMany, run } = runUpload(['Site map.pdf', 'Site map1.pdf']);

			await run();

			const [[entry]] = recordMany.mock.calls[0].arguments;
			assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.FILES_UPLOADED);
			assert.deepStrictEqual(entry.metadata, {
				folderName: "Applicant's documents",
				files: ['Site map.pdf', 'Site map1.pdf']
			});
		});

		it('should not record anything when there was nothing to upload', async () => {
			const { recordMany, run } = runUpload([]);

			await run();

			assert.strictEqual(recordMany.mock.callCount(), 0);
		});
	});

	describe('delete', () => {
		function runDelete(fileNames: string[]) {
			const documents = fileNames.map((fileName, index) => ({
				id: `doc-${index}`,
				fileName,
				s62aCaseId: 'case-1',
				deletedAt: null,
				Folder: { id: 'folder-1', displayName: "Applicant's documents" }
			}));
			const { service, recordMany } = buildService({
				document: {
					findMany: mock.fn(async () => documents),
					updateMany: mock.fn(async () => ({ count: documents.length }))
				}
			});

			const req = {
				params: { id: 'case-1' },
				body: {},
				originalUrl: '/s62a/cases/case-1/case-folders/folder-1/applicants-documents/delete/documents',
				session: { ...session, deleteFilesIds: documents.map((document) => document.id) }
			} as unknown as Request;
			const res = { redirect: mock.fn(), render: mock.fn() } as unknown as Response;

			return { recordMany, run: () => new DocumentDeleter(service).executeDelete(req, res) };
		}

		it('should record a single removal', async () => {
			const { recordMany, run } = runDelete(['Site map.pdf']);

			await run();

			const [[entry]] = recordMany.mock.calls[0].arguments;
			assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.FILE_DELETED);
			assert.deepStrictEqual(entry.metadata, { fileName: 'Site map.pdf' });
		});

		it('should record several removals as one bulk entry', async () => {
			const { recordMany, run } = runDelete(['Site map.pdf', 'Site map1.pdf']);

			await run();

			const [[entry]] = recordMany.mock.calls[0].arguments;
			assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.FILES_DELETED);
			assert.deepStrictEqual(entry.metadata, { files: ['Site map.pdf', 'Site map1.pdf'] });
		});
	});

	describe('download', () => {
		type OnDownloaded = (req: unknown, documents: unknown[], zipFileName?: string) => Promise<void>;

		function onDownloaded(downloader: DocumentDownloader): OnDownloaded {
			const hook = (downloader as unknown as { onDownloaded: OnDownloaded }).onDownloaded;
			return hook.bind(downloader);
		}

		const req = { session } as unknown as Request;
		const document = (fileName: string) => ({
			id: fileName,
			blobName: fileName,
			fileName,
			s62aCaseId: 'case-1',
			S62aCase: { reference: 'S62A/2026/0000001' }
		});

		it('should record a single download', async () => {
			const { service, recordMany } = buildService();

			await onDownloaded(new DocumentDownloader(service))(req, [document('Site map.pdf')]);

			const [[entry]] = recordMany.mock.calls[0].arguments;
			assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.FILE_DOWNLOADED);
			assert.deepStrictEqual(entry.metadata, { fileName: 'Site map.pdf' });
		});

		it('should record a bulk download with the zip name', async () => {
			const { service, recordMany } = buildService();

			await onDownloaded(new DocumentDownloader(service))(
				req,
				[document('Site map.pdf'), document('Site map1.pdf')],
				's62a-2026-0000001-bulk-download-2026-03-16.zip'
			);

			const [[entry]] = recordMany.mock.calls[0].arguments;
			assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.FILES_DOWNLOADED);
			assert.deepStrictEqual(entry.metadata, {
				zipName: 's62a-2026-0000001-bulk-download-2026-03-16.zip',
				files: ['Site map.pdf', 'Site map1.pdf']
			});
		});
	});
});

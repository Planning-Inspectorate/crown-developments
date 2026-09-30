import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FILE_AUDIT_ACTIONS, buildFileAuditEntry } from './files.ts';
import { SHARED_AUDIT_ACTIONS } from './shared-actions.ts';

describe('buildFileAuditEntry', () => {
	it('should use the single action for one file', () => {
		const entry = buildFileAuditEntry({
			caseId: 'case-1',
			userId: 'user-1',
			fileNames: ['Site map.pdf'],
			actions: FILE_AUDIT_ACTIONS.uploaded,
			metadata: { folderName: "Applicant's documents" }
		});

		assert.deepStrictEqual(entry, {
			caseId: 'case-1',
			userId: 'user-1',
			action: SHARED_AUDIT_ACTIONS.FILE_UPLOADED,
			metadata: { folderName: "Applicant's documents", fileName: 'Site map.pdf' }
		});
	});

	it('should use the bulk action, with the file names, for several files', () => {
		const entry = buildFileAuditEntry({
			caseId: 'case-1',
			userId: 'user-1',
			fileNames: ['Site map.pdf', 'Site map1.pdf'],
			actions: FILE_AUDIT_ACTIONS.downloaded,
			metadata: { zipName: 'case-bulk-download-2026-03-16.zip' }
		});

		assert.deepStrictEqual(entry, {
			caseId: 'case-1',
			userId: 'user-1',
			action: SHARED_AUDIT_ACTIONS.FILES_DOWNLOADED,
			metadata: { zipName: 'case-bulk-download-2026-03-16.zip', files: ['Site map.pdf', 'Site map1.pdf'] }
		});
	});

	it('should return null when there are no files', () => {
		assert.strictEqual(
			buildFileAuditEntry({ caseId: 'case-1', userId: 'user-1', fileNames: [], actions: FILE_AUDIT_ACTIONS.deleted }),
			null
		);
	});
});

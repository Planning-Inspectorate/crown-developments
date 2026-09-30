import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRE_APPLICATION_ADVICE_FOLDER } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { SHARED_AUDIT_ACTIONS, SHARED_AUDIT_TEMPLATES, fillTemplate } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { FOLDER_SYNC_RESULT } from '../util/folders.ts';
import { resolvePreApplicationAdviceFolderAudit } from './folders.ts';

const FOLDER_NAME = PRE_APPLICATION_ADVICE_FOLDER.displayName;

describe('resolvePreApplicationAdviceFolderAudit', () => {
	it('should record a created folder', () => {
		const entry = resolvePreApplicationAdviceFolderAudit('case-1', 'user-1', FOLDER_SYNC_RESULT.CREATED);

		assert.deepStrictEqual(entry, {
			caseId: 'case-1',
			userId: 'user-1',
			action: SHARED_AUDIT_ACTIONS.FOLDER_CREATED,
			metadata: { folderName: FOLDER_NAME }
		});
		assert.strictEqual(
			fillTemplate(SHARED_AUDIT_TEMPLATES.FOLDER_CREATED, entry?.metadata),
			`${FOLDER_NAME} was created`
		);
	});

	it('should record a restored folder as created', () => {
		const entry = resolvePreApplicationAdviceFolderAudit('case-1', 'user-1', FOLDER_SYNC_RESULT.RESTORED);

		assert.strictEqual(entry?.action, SHARED_AUDIT_ACTIONS.FOLDER_CREATED);
	});

	it('should record a removed folder', () => {
		const entry = resolvePreApplicationAdviceFolderAudit('case-1', 'user-1', FOLDER_SYNC_RESULT.DELETED);

		assert.strictEqual(entry?.action, SHARED_AUDIT_ACTIONS.FOLDER_DELETED);
		assert.strictEqual(
			fillTemplate(SHARED_AUDIT_TEMPLATES.FOLDER_DELETED, entry?.metadata),
			`${FOLDER_NAME} was removed`
		);
	});

	it('should record nothing when the folder was unchanged', () => {
		assert.strictEqual(resolvePreApplicationAdviceFolderAudit('case-1', 'user-1', FOLDER_SYNC_RESULT.UNCHANGED), null);
	});
});

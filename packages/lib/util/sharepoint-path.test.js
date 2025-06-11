import { describe, it } from 'node:test';
import {
	APPLICATION_FOLDERS,
	buildPath,
	caseReferenceToFolderName,
	getSharePointReceivedPathId,
	representationAttachmentsFolderPath
} from './sharepoint-path.js';
import assert from 'node:assert';

describe('sharepoint-path', () => {
	describe('caseReferenceToFolderName', () => {
		it('should convert case reference to folder name', () => {
			const caseReference = 'CROWN/2025/0100001';
			const actual = caseReferenceToFolderName(caseReference);
			assert.strictEqual(actual, 'CROWN-2025-0100001');
		});
	});
	describe('getSharePointReceivedPathId', () => {
		it('should return the folder ID when user folder is found', async () => {
			const mockSharePointDrive = {
				getItemsByPath: async () => [
					{ name: 'LPA', id: '123' },
					{ name: 'Applicant', id: '456' }
				]
			};

			const result = await getSharePointReceivedPathId(mockSharePointDrive, {
				caseRootName: 'caseRoot',
				user: 'Applicant'
			});
			assert.strictEqual(result, '456');
		});

		it('should throw an error when user is not provided', async () => {
			const mockSharePointDrive = {
				getItemsByPath: async () => []
			};

			await assert.rejects(
				getSharePointReceivedPathId(mockSharePointDrive, { caseRootName: 'caseRoot', user: '' }),
				new Error('Invalid path')
			);
		});

		it('should throw an error when user folder is not found', async () => {
			const mockSharePointDrive = {
				getItemsByPath: async () => [{ name: 'Applicant', id: '123' }]
			};

			await assert.rejects(
				getSharePointReceivedPathId(mockSharePointDrive, { caseRootName: 'caseRoot', user: 'LPA' }),
				new Error('Folder not found in this path: caseRoot/Received')
			);
		});

		it('should throw an error when receivedFolders is empty', async () => {
			const mockSharePointDrive = {
				getItemsByPath: async () => []
			};

			await assert.rejects(
				getSharePointReceivedPathId(mockSharePointDrive, { caseRootName: 'caseRoot', user: 'Applicant' }),
				new Error('Folder not found in this path: caseRoot/Received')
			);
		});
	});
	describe('buildPath', () => {
		it('should build path with provided parameters', () => {
			const caseReferenceFolderName = 'CROWN-2025-0100001';
			const actual = buildPath(caseReferenceFolderName, APPLICATION_FOLDERS.SYSTEM, APPLICATION_FOLDERS.SESSIONS);
			assert.strictEqual(actual, 'CROWN-2025-0100001/System/Sessions');
		});
	});
	describe('representationAttachmentsFolderPath', () => {
		it('should return the representation attachments folder path for a given case reference', () => {
			const caseReference = 'CROWN-2025-0100001';
			const actual = representationAttachmentsFolderPath(caseReference);
			assert.strictEqual(actual, 'CROWN-2025-0100001/System/Representations');
		});
	});
});

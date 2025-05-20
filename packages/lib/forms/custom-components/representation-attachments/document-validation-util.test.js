import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileAlreadyExistsInFolder, sanitiseFileName, validateUploadedFile } from './document-validation-util.js';
import { mockLogger } from '../../../testing/mock-logger.js';
import * as CFB from 'cfb';

describe('./lib/forms/custom-components/representation-attachments/document-validation-util.js', () => {
	describe('validateUploadedFile', () => {
		it('should not return any validation errors when valid file passed', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), []);
		});
		it('should return file size validation error when file is over 20MB', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 20 * 1024 * 1024 + 1
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.pdf: The attachment must be smaller than 20MB'
				}
			]);
		});
		it('should return mime type validation error when file with invalid mime type passed', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'text/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.pdf: The attachment must be PDF, PNG, DOC, DOCX, JPG, JPEG, TIF, TIFF, XLS or XLSX'
				}
			]);
		});
		it('should return validation error when zip file passed', async () => {
			const fakePdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
			const file = {
				originalname: 'test4.zip',
				mimetype: 'application/zip',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.zip: The attachment must be PDF, PNG, DOC, DOCX, JPG, JPEG, TIF, TIFF, XLS or XLSX'
				}
			]);
		});
		it('should return validation errors when file type cannot be determined from signature', async () => {
			const fakePdfContent = 'not a real file';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakePdfContent, 'utf-8'),
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.pdf: Could not determine file type from signature'
				}
			]);
		});
		it('should return a validation error when there is a file signature mismatch', async () => {
			const fakeMp3Content = 'ID3\x03\x00\x00\x00\x00\x00\x21';
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakeMp3Content, 'utf-8'),
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.pdf: File signature mismatch: got audio/mpeg (mp3)'
				}
			]);
		});
		it('should return a validation error when pdf file is password protected', async () => {
			const fakeEncryptedPdf = `%PDF-1.4
					1 0 obj
					<< /Type /Catalog /Pages 2 0 R >>
					endobj
					2 0 obj
					<< /Type /Pages /Kids [3 0 R] /Count 1 >>
					endobj
					3 0 obj
					<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
					endobj
					4 0 obj
					<< /Filter /Standard /V 1 /R 2 /O (...) /U (...) /P -4 >>
					endobj
					trailer
					<< /Root 1 0 R /Encrypt 4 0 R >>
					%%EOF`;
			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from(fakeEncryptedPdf, 'utf-8'),
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.pdf: File must not be password protected'
				}
			]);
		});
		it('should return a validation error when doc/xls file is password protected', async () => {
			const cfbContainer = CFB.utils.cfb_new();
			CFB.utils.cfb_add(cfbContainer, 'EncryptedStream', Buffer.from('fake encrypted data'));
			const buffer = CFB.write(cfbContainer, { type: 'buffer' });

			const file = {
				originalname: 'test4.pdf',
				mimetype: 'application/pdf',
				buffer: buffer,
				size: 227787
			};
			const logger = mockLogger();

			assert.deepStrictEqual(await validateUploadedFile(file, logger), [
				{
					href: '#upload-form',
					text: 'test4.pdf: File must not be password protected'
				}
			]);
		});
	});
	describe('fileAlreadyExistsInFolder', () => {
		it('should return true if file already exists in documents list', () => {
			const documents = [{ name: 'test1.pdf' }, { name: 'test2.pdf' }, { name: 'test3.pdf' }];
			const files = [{ originalname: 'test4.pdf' }, { originalname: 'test5.pdf' }, { originalname: 'test3.pdf' }];
			assert.strictEqual(fileAlreadyExistsInFolder(documents, files), true);
		});
		it('should return false if file does not exists in documents list', () => {
			const documents = [{ name: 'test1.pdf' }, { name: 'test2.pdf' }, { name: 'test3.pdf' }];
			const files = [{ originalname: 'test4.pdf' }, { originalname: 'test5.pdf' }, { originalname: 'test6.pdf' }];
			assert.strictEqual(fileAlreadyExistsInFolder(documents, files), false);
		});
		it('should return false if documents list is empty', () => {
			const files = [{ originalname: 'test4.pdf' }, { originalname: 'test5.pdf' }, { originalname: 'test3.pdf' }];
			assert.strictEqual(fileAlreadyExistsInFolder([], files), false);
		});
		it('should return false if files list is empty', () => {
			const documents = [{ name: 'test4.pdf' }, { name: 'test5.pdf' }, { name: 'test3.pdf' }];
			assert.strictEqual(fileAlreadyExistsInFolder(documents, []), false);
		});
		it('should return false if both lists passed are empty', () => {
			assert.strictEqual(fileAlreadyExistsInFolder([], []), false);
		});
	});
	describe('sanitiseFileName', () => {
		it('should sanitise file that contains invalid characters in its name', () => {
			assert.strictEqual(sanitiseFileName('~$test*:<>#.pdf.'), 'test_____.pdf');
		});
		it('should not sanitise valid file name', () => {
			assert.strictEqual(sanitiseFileName('test.pdf'), 'test.pdf');
		});
	});
});

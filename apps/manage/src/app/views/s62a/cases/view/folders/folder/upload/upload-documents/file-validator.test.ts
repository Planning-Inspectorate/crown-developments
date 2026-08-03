import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Readable } from 'node:stream';
import { FileValidator, type ValidationConfig } from './file-validator.ts';
import 'multer';

const createMockFile = (
	name: string,
	size: number,
	mimetype: string,
	buffer: Buffer = Buffer.from('dummy text data')
): Express.Multer.File => ({
	fieldname: 'file',
	originalname: name,
	encoding: '7bit',
	mimetype,
	size,
	stream: new Readable(),
	destination: '',
	filename: name,
	path: '',
	buffer
});

const defaultConfig: ValidationConfig = {
	allowedExtensions: ['pdf', 'png', 'txt', 'doc'],
	allowedMimeTypes: ['application/pdf', 'image/png', 'text/plain', 'application/msword'],
	maxFileSize: 1024 * 1024,
	totalUploadLimit: 5 * 1024 * 1024,
	maxFileNameLength: 100,
	fileNameRegex: /^[a-zA-Z0-9.\-_ ]+$/,
	allowedExtensionsText: '.pdf, .png, .txt, .doc'
};

const MAGIC_BUFFERS = {
	PDF: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
	PNG: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]),
	ZIP: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
	CFB: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
};

function setupValidator() {
	const mockLogger = {
		info: mock.fn(),
		warn: mock.fn(),
		error: mock.fn()
	};

	// @ts-expect-error - Only passing the logger methods we actually use
	const validator = new FileValidator(mockLogger);

	return { validator, mockLogger };
}

describe('FileValidator', () => {
	describe('Basic Attributes (Size, Name, Limits)', () => {
		it('rejects files with 0 or missing size', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('test.pdf', 0, 'application/pdf');

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.strictEqual(result[0]?.text, 'The attachment is empty');
		});

		it('rejects files exceeding maxFileSize limit', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('huge.pdf', 2 * 1024 * 1024, 'application/pdf');

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.ok(result[0].text.includes('The attachment must be smaller than'));
		});

		it('rejects files exceeding maximum file name length', async () => {
			const { validator } = setupValidator();
			const longName = 'a'.repeat(101) + '.pdf';
			const file = createMockFile(longName, 500, 'application/pdf');

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.ok(result[0].text.includes('exceeds the 100 character limit'));
		});

		it('rejects files with special characters failing the regex', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('test@file!.pdf', 500, 'application/pdf');

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.strictEqual(result[0].text, 'Filename contains special characters. Please remove these and try again.');
		});

		it('rejects files if the name already exists in the folder', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('duplicate.pdf', 500, 'application/pdf');
			const existingNames = new Set(['duplicate.pdf']);

			const result = await validator.validateSingleFile(file, defaultConfig, existingNames);
			assert.strictEqual(result[0].text, 'A file with this name already exists in the folder');
		});

		it('rejects files with a disallowed mimetype', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('test.exe', 500, 'application/x-msdownload');

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.ok(result[0].text.includes('The attachment must be .pdf, .png, .txt, .doc'));
		});
	});

	describe('Special Formats (HTML, GIS, PRJ, etc.)', () => {
		it('validates .html files correctly based on content', async () => {
			const { validator } = setupValidator();
			const validHtml = createMockFile(
				'page.html',
				500,
				'text/html',
				Buffer.from('<!DOCTYPE html><html><body></body></html>')
			);
			const invalidHtml = createMockFile('bad.html', 500, 'text/html', Buffer.from('just some random text'));

			const validResult = await validator.validateSingleFile(
				validHtml,
				{ ...defaultConfig, allowedMimeTypes: ['text/html'] },
				new Set()
			);
			const invalidResult = await validator.validateSingleFile(
				invalidHtml,
				{ ...defaultConfig, allowedMimeTypes: ['text/html'] },
				new Set()
			);

			assert.deepStrictEqual(validResult, []);
			assert.strictEqual(invalidResult[0]?.text, 'The attachment is not a valid .html file');
		});

		it('validates .shp and .shx files using hex header', async () => {
			const { validator } = setupValidator();
			const validShpBuffer = Buffer.from([0x00, 0x00, 0x27, 0x0a, 0x00, 0x00, 0x00, 0x00]);
			const validShp = createMockFile('map.shp', 500, 'application/octet-stream', validShpBuffer);

			const config = { ...defaultConfig, allowedMimeTypes: ['application/octet-stream'] };
			const result = await validator.validateSingleFile(validShp, config, new Set());

			assert.deepStrictEqual(result, []);
		});

		it('rejects invalid .gis files', async () => {
			const { validator } = setupValidator();
			const invalidGis = createMockFile(
				'map.gis',
				500,
				'application/octet-stream',
				Buffer.from('No location data here')
			);

			const config = { ...defaultConfig, allowedMimeTypes: ['application/octet-stream'] };
			const result = await validator.validateSingleFile(invalidGis, config, new Set());

			assert.strictEqual(result[0]?.text, 'The attachment is not a valid .gis file');
		});
	});

	describe('File Signatures & Spoofing (file-type integration)', () => {
		it('allows text/plain .txt files even though they lack a binary signature', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('notes.txt', 500, 'text/plain', Buffer.from('Hello world'));

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.deepStrictEqual(result, []);
		});

		it('rejects unknown files if file-type cannot determine the signature', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('fake.pdf', 500, 'application/pdf', Buffer.from('garbage data'));

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.strictEqual(result[0]?.text, 'Could not determine file type from signature');
		});

		it('blocks ZIP files unconditionally', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('archive.zip', 500, 'application/zip', MAGIC_BUFFERS.ZIP);

			const config = { ...defaultConfig, allowedMimeTypes: ['application/zip'] };
			const result = await validator.validateSingleFile(file, config, new Set());

			assert.strictEqual(result[0]?.text, 'The attachment must not be a zip file');
		});

		it('detects spoofing when the actual binary signature is not allowed', async () => {
			const { validator } = setupValidator();

			const GIF_MAGIC_BYTES = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
			const file = createMockFile('sneaky.pdf', 500, 'application/pdf', GIF_MAGIC_BYTES);

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());

			assert.strictEqual(result.length, 1);
			assert.ok(result[0]?.text.includes('detected as .gif (image/gif)'));
		});

		it('passes perfectly valid files that match their signature', async () => {
			const { validator } = setupValidator();
			const file = createMockFile('real.pdf', 500, 'application/pdf', MAGIC_BUFFERS.PDF);

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());
			assert.deepStrictEqual(result, []);
		});
	});

	describe('Encryption Checks (CFB/Office)', () => {
		it('rejects password protected / encrypted .cfb files', async () => {
			const { validator, mockLogger } = setupValidator();

			const file = createMockFile('secure.doc', 500, 'application/msword', MAGIC_BUFFERS.CFB);

			const result = await validator.validateSingleFile(file, defaultConfig, new Set());

			assert.strictEqual(result[0]?.text, 'File must not be password protected');
			assert.strictEqual(mockLogger.error.mock.calls.length, 1);
			assert.ok(
				mockLogger.error.mock.calls[0].arguments[1].includes('Error parsing .doc or .xls file for encryption checks')
			);
		});
	});
});

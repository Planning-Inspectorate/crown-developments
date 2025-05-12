import fileType from 'file-type';

import * as CFB from 'cfb';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

const ALLOWED_MIME_TYPES = new Set([
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/tiff',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/x-cfb'
]);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'doc', 'docx', 'xls', 'xlsx', 'cfb']);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function validateUploadedFile(file) {
	const validationErrors = [];
	const { originalname, mimetype, buffer, size } = file;

	if (!ALLOWED_MIME_TYPES.has(mimetype)) {
		validationErrors.push(
			`${originalname}: The attachment must be PDF, PNG, DOC, DOCX, JPG, JPEG, TIF, TIFF, XLS or XLSX`
		);
	}

	const fileTypeResult = await fileType.fromBuffer(buffer);
	if (!fileTypeResult) {
		validationErrors.push(`${originalname}: Could not determine file type from signature`);
	}

	const { mime, ext } = fileTypeResult;

	if (ext === 'zip' || mime === 'application/zip') {
		validationErrors.push(`${originalname}: The attachment must not be a zip file`);
	}

	if ((ext === 'pdf' || mime === 'application/pdf') && (await isPdfPasswordProtected(buffer))) {
		validationErrors.push(`${originalname}: file must not be password protected`);
	}

	if (
		(ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') &&
		(await isOfficeFileEncrypted(buffer))
	) {
		validationErrors.push(`${originalname}: file must not be password protected`);
	}

	if (
		(ext === 'xlsx' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') &&
		(await isOfficeFileEncrypted(buffer))
	) {
		validationErrors.push(`${originalname}: file must not be password protected`);
	}

	if ((ext === 'cfb' || mime === 'application/x-cfb') && (await isDocOrXlsEncrypted(buffer))) {
		validationErrors.push(`${originalname}: file must not be password protected`);
	}

	if (!ALLOWED_MIME_TYPES.has(mime) || !ALLOWED_EXTENSIONS.has(ext)) {
		validationErrors.push(`${originalname}: File signature mismatch: got ${mime} (${ext})`);
	}

	if (size > MAX_FILE_SIZE) {
		validationErrors.push(`${originalname}: The attachment must be smaller than 20MB`);
	}

	return validationErrors;
}

export async function isPdfPasswordProtected(buffer) {
	try {
		await PDFDocument.load(buffer);
		return false;
	} catch (err) {
		console.log(err);
		return true;
	}
}

async function isOfficeFileEncrypted(buffer) {
	const zip = await JSZip.loadAsync(buffer);
	return zip.file('EncryptedPackage') !== null;
}

function isDocOrXlsEncrypted(buffer) {
	const container = CFB.parse(buffer, { type: 'buffer' });

	const summary = container.FullPaths.includes('EncryptedPackage');
	const isEncryptedStream = container.FileIndex.some(
		(entry) => entry.name === 'WordDocument' && entry.content && entry.content[0] === 0x13
	);

	return summary || isEncryptedStream;
}

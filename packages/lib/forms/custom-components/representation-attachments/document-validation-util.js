import fileType from 'file-type';

import * as CFB from 'cfb';
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

export async function validateUploadedFile(file, logger) {
	const validationErrors = [];
	const { originalname, mimetype, buffer, size } = file;

	if (!ALLOWED_MIME_TYPES.has(mimetype)) {
		validationErrors.push({
			text: `${originalname}: The attachment must be PDF, PNG, DOC, DOCX, JPG, JPEG, TIF, TIFF, XLS or XLSX`,
			href: '#upload-form'
		});
	}

	const fileTypeResult = await fileType.fromBuffer(buffer);
	if (!fileTypeResult) {
		validationErrors.push({
			text: `${originalname}: Could not determine file type from signature`,
			href: '#upload-form'
		});
		return validationErrors;
	}

	const { mime, ext } = fileTypeResult;

	if (ext === 'zip' || mime === 'application/zip') {
		validationErrors.push({
			text: `${originalname}: The attachment must not be a zip file`,
			href: '#upload-form'
		});
	}

	if ((ext === 'pdf' || mime === 'application/pdf') && (await isPdfPasswordProtected(buffer, logger))) {
		validationErrors.push({
			text: `${originalname}: File must not be password protected`,
			href: '#upload-form'
		});
	}

	if ((ext === 'cfb' || mime === 'application/x-cfb') && (await isDocOrXlsEncrypted(buffer))) {
		validationErrors.push({
			text: `${originalname}: File must not be password protected`,
			href: '#upload-form'
		});
	}

	if (!ALLOWED_MIME_TYPES.has(mime) || !ALLOWED_EXTENSIONS.has(ext)) {
		validationErrors.push({
			text: `${originalname}: File signature mismatch: got ${mime} (${ext})`,
			href: '#upload-form'
		});
	}

	if (size > MAX_FILE_SIZE) {
		validationErrors.push({
			text: `${originalname}: The attachment must be smaller than 20MB`,
			href: '#upload-form'
		});
	}

	return validationErrors;
}

async function isPdfPasswordProtected(buffer, logger) {
	try {
		await PDFDocument.load(buffer);
		return false;
	} catch (err) {
		logger.warn({ err }, `PDF document is password protected`);
		return true;
	}
}

function isDocOrXlsEncrypted(buffer) {
	const container = CFB.parse(buffer, { type: 'buffer' });
	const hasEncryptedStream = container.FullPaths.some(
		(fullPath) => fullPath.includes('EncryptedPackage') || fullPath.includes('EncryptedStream')
	);
	const isEncryptedStream = container.FileIndex.some(
		(entry) =>
			(entry.name === 'WordDocument' || entry.name === 'Workbook') && entry.content && entry.content[0] === 0x13
	);

	return hasEncryptedStream || isEncryptedStream;
}

export function fileAlreadyExistsInFolder(documents, files) {
	const sharepointFolderFileNames = documents.map((document) => document.name);
	return files.map((file) => file.name).some((fileName) => sharepointFolderFileNames.includes(fileName));
}

export function sanitiseFileName(fileName) {
	const cleaned = fileName.replace(/["*:<>?/\\|#]/g, '_');
	const trimmed = cleaned.replace(/[.\s]+$/, '');
	if (trimmed.startsWith('~$')) {
		return trimmed.replace(/^~\$/, '');
	}

	return trimmed;
}

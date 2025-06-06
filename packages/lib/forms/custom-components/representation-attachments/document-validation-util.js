import fileType from 'file-type';

import * as CFB from 'cfb';
import { PDFDocument } from 'pdf-lib';

export async function validateUploadedFile(file, logger, allowedFileExtensions, allowedMimeTypes, maxFileSize) {
	const validationErrors = [];
	const { originalname, mimetype, buffer, size } = file;

	if (!allowedMimeTypes.includes(mimetype)) {
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

	// Compound File Binary (.cfb) is a Microsoft file container format that acts like a mini filesystem inside a file
	// common users include older Microsoft Office files such as .doc and .xls
	if ((ext === 'cfb' || mime === 'application/x-cfb') && (await isDocOrXlsEncrypted(buffer))) {
		validationErrors.push({
			text: `${originalname}: File must not be password protected`,
			href: '#upload-form'
		});
	}

	// this check is to prevent file spoofing and checks the parsed result returned from file-type library
	if (
		!new Set([...allowedMimeTypes, 'application/x-cfb']).has(mime) ||
		!new Set([...allowedFileExtensions, 'cfb']).has(ext)
	) {
		validationErrors.push({
			text: `${originalname}: File signature mismatch: declared as .${mimetype} but detected as .${ext} (${mime})`,
			href: '#upload-form'
		});
	}

	if (size > maxFileSize) {
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
	return files.map((file) => file.originalname).some((fileName) => sharepointFolderFileNames.includes(fileName));
}

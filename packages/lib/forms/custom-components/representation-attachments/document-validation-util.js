import { fileTypeFromBuffer } from 'file-type';

import * as CFB from 'cfb';
import { PDFDocument } from 'pdf-lib';

export async function validateUploadedFile(file, logger, allowedFileExtensions, allowedMimeTypes, maxFileSize) {
	let validationErrors = [];
	const { originalname, mimetype, buffer, size } = file;

	if (typeof size !== 'number' || size <= 0) {
		validationErrors.push({
			text: `${originalname}: The attachment is empty`,
			href: '#upload-form'
		});
		return validationErrors;
	}

	if (!allowedMimeTypes.includes(mimetype)) {
		validationErrors.push({
			text: `${originalname}: The attachment must be PDF, PNG, DOC, DOCX, JPG, JPEG, TIF, TIFF, XLS or XLSX`,
			href: '#upload-form'
		});
	}

	const fileTypeResult = await fileTypeFromBuffer(buffer);
	logger.info(fileTypeResult);
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
	if ((ext === 'cfb' || mime === 'application/x-cfb') && (await isDocOrXlsEncrypted(buffer, logger))) {
		validationErrors.push({
			text: `${originalname}: File must not be password protected`,
			href: '#upload-form'
		});
	}

	// this check is to prevent file spoofing and checks the parsed result returned from file-type library
	if (
		allowedMimeTypes.includes(mimetype) &&
		(!new Set([...allowedMimeTypes, 'application/x-cfb']).has(mime) ||
			!new Set([...allowedFileExtensions, 'cfb']).has(ext))
	) {
		const declaredExt = mimetype.split('/')[1];
		validationErrors.push({
			text: `${originalname}: File signature mismatch: declared as .${declaredExt} (${mimetype}) but detected as .${ext} (${mime})`,
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

export function isDocOrXlsEncrypted(buffer, logger) {
	try {
		const container = CFB.parse(buffer, { type: 'buffer' });

		// Word: Check fEncrypted flag in WordDocument stream at offset 0x0B
		const wordEntry = container.FileIndex.find((entry) => entry.name === 'WordDocument');
		if (wordEntry && wordEntry.content && wordEntry.content.length > 0x0b) {
			const fEncrypted = (wordEntry.content[0x0b] & 0x01) === 0x01;
			if (fEncrypted) return true;
		}

		// Excel: Look for "FILEPASS" record (0x002F) at the beginning of Workbook stream
		const workbookEntry = container.FileIndex.find((entry) => entry.name === 'Workbook');
		if (workbookEntry && workbookEntry.content) {
			if (hasFilePassRecord(workbookEntry.content)) {
				return true;
			}
		}

		// Also check for encrypted streams
		const hasEncryptedStream = container.FileIndex.some((entry) =>
			['encryptedstream', 'encryptedpackage', 'encryptioninfo'].includes(entry.name?.toLowerCase())
		);

		return hasEncryptedStream;
	} catch (err) {
		logger.error({ err }, `error parsing .doc or .xls file`);
		// If parsing fails, we assume file might be encrypted or corrupt
		return true;
	}
}

function hasFilePassRecord(buffer) {
	let offset = 0;
	while (offset + 4 < buffer.length) {
		const recordType = buffer.readUInt16LE(offset);
		const recordLength = buffer.readUInt16LE(offset + 2);

		if (recordType === 0x002f) {
			// FILEPASS found - file is password protected
			return true;
		}

		offset += 4 + recordLength;
	}
	return false;
}

export function fileAlreadyExistsInFolder(documents, files) {
	const sharepointFolderFileNames = documents.map((document) => document.name);
	return files.map((file) => file.originalname).some((fileName) => sharepointFolderFileNames.includes(fileName));
}

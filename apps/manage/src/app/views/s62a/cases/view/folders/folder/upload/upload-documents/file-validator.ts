import path from 'path';
import * as CFB from 'cfb';
import { fileTypeFromBuffer } from 'file-type';
import type { Logger } from 'pino';
import { formatBytes } from '../upload-utils.ts';
import 'multer';

export interface ValidationConfig {
	allowedExtensions: string[];
	allowedMimeTypes: string[];
	maxFileSize: number;
	totalUploadLimit: number;
	maxFileNameLength: number;
	fileNameRegex: RegExp;
	allowedExtensionsText: string;
}

export interface ValidationError {
	text: string;
	href: string;
}

export class FileValidator {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Deep validates a single file's extension, mime type, binary signature, and encryption.
	 */
	async validateSingleFile(
		file: Express.Multer.File,
		config: ValidationConfig,
		existingNameSet: Set<string>
	): Promise<ValidationError[]> {
		const { originalname, buffer, mimetype } = file;
		const decodedName = Buffer.from(originalname, 'latin1').toString('utf8');

		const basicErrors = this.validateBasicAttributes(file, decodedName, config, existingNameSet);
		if (basicErrors.length > 0) return basicErrors;

		const declaredExt = path.extname(decodedName).slice(1).toLowerCase();

		if (['html', 'prj', 'gis', 'dbf', 'shp', 'shx'].includes(declaredExt)) {
			return this.validateSpecialFormats(file, declaredExt);
		}

		const fileTypeResult = await fileTypeFromBuffer(buffer);

		if (!fileTypeResult) {
			if (declaredExt === 'txt' && mimetype === 'text/plain') {
				return [];
			}
			return [
				{
					text: `Could not determine file type from signature`,
					href: '#upload-form'
				}
			];
		}

		const spoofingErrors = this.validateFileSignature(file, decodedName, fileTypeResult, config);
		if (spoofingErrors.length > 0) return spoofingErrors;

		return this.validateEncryption(file, decodedName, fileTypeResult);
	}

	/**
	 * Validates basic attributes like making sure the file isn't too big or too long.
	 */
	private validateBasicAttributes(
		file: Express.Multer.File,
		decodedName: string,
		config: ValidationConfig,
		existingNameSet: Set<string>
	): ValidationError[] {
		const errors: ValidationError[] = [];
		const { size, mimetype } = file;

		if (typeof size !== 'number' || size <= 0) {
			errors.push({ text: `The attachment is empty`, href: '#upload-form' });
			return errors;
		}

		if (size > config.maxFileSize) {
			errors.push({
				text: `The attachment must be smaller than ${formatBytes(config.maxFileSize)}`,
				href: '#upload-form'
			});
		}

		if (decodedName.length > config.maxFileNameLength) {
			errors.push({
				text: `The attachment name exceeds the ${config.maxFileNameLength} character limit`,
				href: '#upload-form'
			});
		}

		if (!config.fileNameRegex.test(decodedName)) {
			errors.push({
				text: `Filename contains special characters. Please remove these and try again.`,
				href: '#upload-form'
			});
		}

		if (existingNameSet.has(decodedName)) {
			errors.push({
				text: `A file with this name already exists in the folder`,
				href: '#upload-form'
			});
		}

		if (!config.allowedMimeTypes.includes(mimetype)) {
			errors.push({
				text: `The attachment must be ${config.allowedExtensionsText}`,
				href: '#upload-form'
			});
		}

		return errors;
	}

	/**
	 * Checks more unique file types to make sure there isn't any spoofing occurring.
	 */
	private validateSpecialFormats(file: Express.Multer.File, ext: string): ValidationError[] {
		const { buffer } = file;
		const text = buffer.toString('utf8', 0, 200).trim();
		const header = buffer.subarray(0, 8).toString('hex').toUpperCase();

		const errors: ValidationError[] = [];

		switch (ext) {
			case 'html':
				if (!text.toLowerCase().includes('<html') && !text.toLowerCase().includes('<!doctype html')) {
					errors.push({ text: `The attachment is not a valid .html file`, href: '#upload-form' });
				}
				break;
			case 'prj':
				if (!(text.startsWith('PROJCS[') || text.startsWith('GEOGCS['))) {
					errors.push({ text: `The attachment is not a valid .prj file`, href: '#upload-form' });
				}
				break;
			case 'gis':
				if (!/coordinate|longitude|latitude/i.test(text)) {
					errors.push({ text: `The attachment is not a valid .gis file`, href: '#upload-form' });
				}
				break;
			case 'dbf':
				if (!['03', '83', '8B', '8E'].includes(header.slice(0, 2))) {
					errors.push({ text: `The attachment is not a valid .dbf file`, href: '#upload-form' });
				}
				break;
			case 'shp':
			case 'shx':
				if (!header.startsWith('0000270A')) {
					errors.push({
						text: `The attachment is not a valid .shp or .shx file`,
						href: '#upload-form'
					});
				}
				break;
		}

		return errors;
	}

	/**
	 * Checks the file signatures match, again to stop fake files tricking the system
	 */
	private validateFileSignature(
		file: Express.Multer.File,
		decodedName: string,
		fileTypeResult: { ext: string; mime: string },
		config: ValidationConfig
	): ValidationError[] {
		const { mimetype } = file;
		const { ext, mime } = fileTypeResult;
		const errors: ValidationError[] = [];

		if (ext === 'zip' || mime === 'application/zip') {
			return [{ text: `The attachment must not be a zip file`, href: '#upload-form' }];
		}

		const isAllowedMime = new Set([...config.allowedMimeTypes, 'application/x-cfb']).has(mime);
		const isAllowedExt = new Set([...config.allowedExtensions, 'cfb']).has(ext);

		if (!isAllowedMime || !isAllowedExt) {
			const declaredExt = mimetype.split('/')[1] || 'unknown';
			errors.push({
				text: `File signature mismatch: declared as .${declaredExt} (${mimetype}) but detected as .${ext} (${mime})`,
				href: '#upload-form'
			});
		}

		return errors;
	}

	/**
	 * Blocks against password protected files
	 */
	private validateEncryption(
		file: Express.Multer.File,
		decodedName: string,
		fileTypeResult: { ext: string; mime: string }
	): ValidationError[] {
		const { buffer } = file;
		const { ext, mime } = fileTypeResult;
		const errors: ValidationError[] = [];

		if ((ext === 'cfb' || mime === 'application/x-cfb') && this.isDocOrXlsEncrypted(buffer)) {
			errors.push({ text: `File must not be password protected`, href: '#upload-form' });
		}

		return errors;
	}

	private isDocOrXlsEncrypted(buffer: Buffer): boolean {
		try {
			const container = CFB.parse(buffer, { type: 'buffer' });

			const hasEncryptedStream = container.FileIndex.some((entry) =>
				['encryptedstream', 'encryptedpackage', 'encryptioninfo'].includes(entry.name?.toLowerCase())
			);

			if (hasEncryptedStream) return true;

			const wordEntry = container.FileIndex.find((entry) => entry.name === 'WordDocument');
			if (wordEntry && wordEntry.content && wordEntry.content.length > 0x0b) {
				const content = wordEntry.content;
				if ((content[0x0b] & 0x01) === 0x01) return true;
			}

			const workbookEntry = container.FileIndex.find((entry) => entry.name === 'Workbook');
			if (workbookEntry && workbookEntry.content) {
				const contentBuffer = Buffer.from(workbookEntry.content);
				if (this.hasFilePassRecord(contentBuffer)) return true;
			}

			return false;
		} catch (err) {
			this.logger.error({ err }, `Error parsing .doc or .xls file for encryption checks`);
			return true;
		}
	}

	private hasFilePassRecord(buffer: Buffer): boolean {
		let offset = 0;
		while (offset + 4 < buffer.length) {
			const recordType = buffer.readUInt16LE(offset);
			const recordLength = buffer.readUInt16LE(offset + 2);

			if (recordType === 0x002f) {
				// FilePass record
				return true;
			}

			offset += 4 + recordLength;
		}
		return false;
	}
}

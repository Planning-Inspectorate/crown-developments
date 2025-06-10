import { APPLICATION_FOLDERS, buildPath, caseReferenceToFolderName } from '../../../util/sharepoint-path.js';
import { fileAlreadyExistsInFolder, validateUploadedFile } from './document-validation-util.js';
import { FILE_PROPERTIES } from '../../../documents/view-model.js';
import { isValidUuidFormat } from '../../../util/uuid.js';
import { notFoundHandler } from '../../../middleware/errors.js';
import { sortByField } from '../../../util/array.js';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { addSessionData } from '../../../util/session.js';

const CONTENT_UPLOAD_FILE_LIMIT = 4 * 1024 * 1024; // 4MB

export function uploadDocumentsController(
	{ db, logger, appName, sharePointDrive, getSharePointDrive },
	allowedFileExtensions,
	allowedMimeTypes,
	maxFileSize
) {
	return async (req, res) => {
		const applicationId = req.params.id || req.params.applicationId;
		if (!applicationId) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(applicationId)) {
			return notFoundHandler(req, res);
		}

		const drive = sharePointDrive ? sharePointDrive : getSharePointDrive(req.session);

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id: applicationId }
		});

		const caseReference = crownDevelopment.reference;
		const sessionId = req.sessionID;
		const journeyResponse = res.locals?.journeyResponse;
		const journeyId = journeyResponse?.journeyId;
		const submittedForId = getSubmittedForId(journeyResponse?.answers);

		const folderPath = await createSessionSharepointFolders(
			drive,
			logger,
			caseReference,
			appName,
			sessionId,
			applicationId,
			journeyId,
			submittedForId
		);
		const documents = await fetchDocumentsInFolderPath(drive, folderPath);
		const totalSize = documents.reduce((sum, item) => sum + (item.size || 0), 0);
		const fileErrors = [];

		if (Array.isArray(req.files) && req.files.length > 3) {
			fileErrors.push({
				text: 'You can only upload up to 3 files at a time',
				href: '#upload-form'
			});
		}

		const fileValidationErrors = (
			await Promise.all(
				req.files.map((file) =>
					validateUploadedFile(file, logger, allowedFileExtensions, allowedMimeTypes, maxFileSize)
				)
			)
		)
			.flat()
			.filter(Boolean);

		fileErrors.push(...fileValidationErrors);

		if (fileAlreadyExistsInFolder(documents, req.files)) {
			fileErrors.push({
				text: 'Attachment with this name has already been uploaded',
				href: '#upload-form'
			});
		}

		if (totalSize > 1073741824) {
			fileErrors.push({
				text: 'Total file size of all attachments must be smaller than 1GB',
				href: '#upload-form'
			});
		}

		if (fileErrors.length > 0) {
			req.session.errors = {
				'upload-form': { msg: 'Errors encountered during file upload' }
			};
			req.session.errorSummary = fileErrors;
		} else {
			for (const file of req.files) {
				try {
					if (file.size > CONTENT_UPLOAD_FILE_LIMIT) {
						const uploadSession = await drive.createLargeDocumentUploadSession(folderPath, file);
						const uploadUrl = uploadSession.uploadUrl;
						await processChunkDocumentUpload(file, uploadUrl, logger);
					} else {
						await drive.uploadDocumentToFolder(folderPath, file);
					}
				} catch (error) {
					const filename = file.originalname;
					logger.error(
						{ error, caseReference, sessionId },
						`Error uploading file: ${filename} to Sharepoint folder: ${folderPath}`
					);
					throw new Error(`Failed to upload file: ${filename}`);
				}
			}

			const documentsUpdated = await fetchDocumentsInFolderPath(drive, folderPath);
			const uploadedFiles = [];
			documentsUpdated.forEach((document) => {
				uploadedFiles.push({
					itemId: document.id,
					fileName: document.name,
					mimeType: document.file.mimeType,
					size: document.size
				});
			});

			addSessionData(req, applicationId, { [submittedForId]: { uploadedFiles } }, 'files');
		}

		const redirectUrl = getRedirectUrl(appName, applicationId, journeyId, submittedForId);
		res.redirect(redirectUrl);
	};
}

export function deleteDocumentsController({ logger, appName, sharePointDrive, getSharePointDrive }) {
	return async (req, res) => {
		const drive = sharePointDrive ? sharePointDrive : getSharePointDrive(req.session);

		const applicationId = req.params.id || req.params.applicationId;
		const itemId = req.params.documentId;
		const journeyResponse = res.locals?.journeyResponse;
		const journeyId = journeyResponse?.journeyId;
		const submittedForId = getSubmittedForId(journeyResponse?.answers);

		try {
			await drive.deleteDocumentById(itemId);
		} catch (error) {
			logger.error({ error, applicationId, itemId }, `Error deleting file: ${itemId} from Sharepoint folder`);
			throw new Error('Failed to delete file');
		}

		let uploadedFiles = req.session?.files?.[applicationId]?.[submittedForId]?.uploadedFiles || [];
		uploadedFiles = uploadedFiles.filter((file) => file.itemId !== itemId);

		addSessionData(req, applicationId, { [submittedForId]: { uploadedFiles } }, 'files');

		const redirectUrl = getRedirectUrl(appName, applicationId, journeyId, submittedForId);
		res.redirect(redirectUrl);
	};
}

async function createSessionSharepointFolders(
	sharePointDrive,
	logger,
	caseReference,
	appName,
	sessionId,
	applicationId,
	journeyId,
	submittedForId
) {
	const caseReferenceFolder = caseReferenceToFolderName(caseReference);
	const applicationNameFolder = appName === 'portal' ? APPLICATION_FOLDERS.PORTAL : APPLICATION_FOLDERS.MANAGE;

	const folderSteps = [
		{ name: APPLICATION_FOLDERS.SYSTEM, description: 'System folder' },
		{ name: APPLICATION_FOLDERS.SESSIONS, description: 'Session folder' },
		{ name: applicationNameFolder, description: `${applicationNameFolder} folder` },
		{ name: sessionId, description: 'Session ID folder' },
		{ name: applicationId, description: 'Application ID folder' },
		{ name: journeyId, description: `"${journeyId}" folder` },
		{ name: submittedForId, description: `"${submittedForId}" folder` }
	];

	let currentPath = caseReferenceFolder;

	for (const step of folderSteps) {
		await createFolder({
			sharePointDrive,
			logger,
			caseReference,
			sessionId,
			path: currentPath,
			folderName: step.name,
			description: step.description
		});

		currentPath = buildPath(currentPath, step.name);
	}

	return currentPath;
}

async function createFolder({ sharePointDrive, logger, caseReference, sessionId, path, folderName, description }) {
	try {
		logger.info({ path, folderName }, `Attempting to create ${description}`);
		await sharePointDrive.addNewFolder(path, folderName);
	} catch (error) {
		if (error.statusCode === 409) {
			logger.info({ path, folderName }, `Folder already exists: ${description}`);
		} else {
			logger.error({ error, caseReference, sessionId, path, folderName }, `Error creating ${description}`);
			throw new Error(`Failed to create SharePoint folder: ${description}`);
		}
	}
}

async function fetchDocumentsInFolderPath(sharePointDrive, folderPath) {
	const documents = await sharePointDrive.getItemsByPath(folderPath, [['$select', FILE_PROPERTIES.join(',')]]);
	documents.sort(sortByField('lastModifiedDateTime', true));
	return documents;
}

async function processChunkDocumentUpload(file, uploadUrl, logger) {
	const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
	const buffer = file.buffer;
	const totalSize = buffer.length;
	let start = 0;

	const MAX_CHUNKS = Math.ceil(totalSize / CHUNK_SIZE) + 5;
	let loopCount = 0;

	while (start < totalSize) {
		if (loopCount++ > MAX_CHUNKS) {
			logger.error({ fileName: file.originalname }, 'Exceeded max loop iterations during upload.');
			throw new Error(`${file.originalname}: Chunk upload failed - exceeded max loop iterations during upload`);
		}

		const end = Math.min(start + CHUNK_SIZE, totalSize);
		const chunk = buffer.slice(start, end);

		const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;

		const response = await fetch(uploadUrl, {
			method: 'PUT',
			headers: {
				'Content-Length': chunk.length,
				'Content-Range': contentRange
			},
			body: chunk
		});

		if (![200, 201, 202].includes(response.status)) {
			logger.error({ fileName: file.originalname }, 'error encountered during chunk upload of large file');
			const errorText = await response.text();
			throw new Error(`${file.originalname}: chunk upload failed ${response.status} ${errorText}`);
		}

		start = end;
	}
	logger.info({ fileName: file.originalname }, 'large file successfully uploaded');
}

function getRedirectUrl(appName, applicationId, journeyId, submittedForId) {
	const journeyMap = {
		myself: 'myself',
		'on-behalf-of': 'agent'
	};

	const redirectUrlMap = {
		'have-your-say': `/applications/${applicationId}/${journeyId}/${journeyMap[submittedForId]}/select-attachments`,
		'add-representation': `/cases/${applicationId}/manage-representations/${journeyId}/${journeyMap[submittedForId]}/select-attachments`
	};

	return redirectUrlMap[journeyId];
}

function getSubmittedForId(answers) {
	return answers['submittedForId'] === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		? REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF;
}

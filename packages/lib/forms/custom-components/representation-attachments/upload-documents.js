import { APPLICATION_FOLDERS, buildPath, caseReferenceToFolderName } from '../../../util/sharepoint-path.js';
import { fetchPublishedApplication } from 'crowndev-portal/src/util/applications.js';
import { fileAlreadyExistsInFolder, validateUploadedFile } from './document-validation-util.js';
import { FILE_PROPERTIES } from '../../../documents/view-model.js';
import { isValidUuidFormat } from '../../../util/uuid.js';
import { notFoundHandler } from '../../../middleware/errors.js';
import { sortByField } from '../../../util/array.js';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function uploadDocumentsController({ db, logger, sharePointDrive, appName }) {
	return async (req, res) => {
		const applicationId = req.params.id || req.params.applicationId;
		if (!applicationId) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(applicationId)) {
			return notFoundHandler(req, res);
		}

		const crownDevelopment = await fetchPublishedApplication({
			id: applicationId,
			db,
			args: {}
		});

		const caseReference = crownDevelopment.reference;
		const sessionId = req.sessionID;
		const journeyResponse = res.locals?.journeyResponse;
		const journeyId = journeyResponse?.journeyId;
		const submittedForId = getSubmittedForId(journeyResponse?.answers);

		const folderPath = await createSessionSharepointFolders(
			sharePointDrive,
			logger,
			caseReference,
			appName,
			sessionId,
			applicationId,
			journeyId,
			submittedForId
		);
		const documents = await fetchDocumentsInFolderPath(sharePointDrive, folderPath);
		const totalSize = documents.reduce((sum, item) => sum + (item.size || 0), 0);
		const fileErrors = (await Promise.all(req.files.map((file) => validateUploadedFile(file, logger))))
			.flat()
			.filter(Boolean);

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
				'upload-form': { msg: 'Errors encountered during file upload.' }
			};
			req.session.errorSummary = fileErrors;
		} else {
			for (const file of req.files) {
				try {
					if (file.size >= 4 * 1024 * 1024) {
						const uploadSession = await sharePointDrive.createLargeDocumentUploadSession(folderPath, file);
						const uploadUrl = uploadSession.uploadUrl;
						await processChunkDocumentUpload(file, uploadUrl, logger);
					} else {
						await sharePointDrive.uploadDocumentToFolder(folderPath, file);
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

			const documentsUpdated = await fetchDocumentsInFolderPath(sharePointDrive, folderPath);
			const uploadedFiles = [];
			documentsUpdated.forEach((document) => {
				uploadedFiles.push({
					id: document.id,
					name: document.name,
					mimeType: document.file.mimeType,
					size: document.size
				});
			});

			addFilesToSession(req, applicationId, { uploadedFiles }, 'files', submittedForId);
		}

		const redirectUrl = getRedirectUrl(applicationId, journeyId, submittedForId);
		res.redirect(redirectUrl);
	};
}

function addFilesToSession(req, id, data, sessionField, submittedForId) {
	if (!req.session) {
		throw new Error('request session required');
	}

	const filesField = (req.session[sessionField] ||= {});
	const fieldProps = (filesField[id] ||= {});
	const submittedForIdField = (fieldProps[submittedForId] ||= {});

	const isSafeKey = (key) => !['__proto__', 'constructor', 'prototype'].includes(key);
	for (const key of Object.keys(data)) {
		if (isSafeKey(key)) {
			submittedForIdField[key] = data[key];
		}
	}
}

export function deleteDocumentsController({ logger, sharePointDrive }) {
	return async (req, res) => {
		const applicationId = req.params.id || req.params.applicationId;
		const itemId = req.params.documentId;
		const journeyResponse = res.locals?.journeyResponse;
		const journeyId = journeyResponse?.journeyId;
		const submittedForId = getSubmittedForId(journeyResponse?.answers);

		try {
			await sharePointDrive.deleteDocumentById(itemId);
		} catch (error) {
			logger.error({ error, applicationId, itemId }, `Error deleting file: ${itemId} from Sharepoint folder`);
			throw new Error('Failed to delete file');
		}

		let uploadedFiles = req.session?.files?.[applicationId]?.[submittedForId]?.uploadedFiles || [];
		uploadedFiles = uploadedFiles.filter((file) => file.id !== itemId);

		addFilesToSession(req, applicationId, { uploadedFiles }, 'files', submittedForId);

		const redirectUrl = getRedirectUrl(applicationId, journeyId, submittedForId);
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

	while (start < totalSize) {
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

function getRedirectUrl(applicationId, journeyId, submittedForId) {
	const journeyMap = {
		myself: 'myself',
		'on-behalf-of': 'agent'
	};

	return `/applications/${applicationId}/${journeyId}/${journeyMap[submittedForId]}/select-attachments`;
}

function getSubmittedForId(answers) {
	return answers['submittedForId'] === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		? REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF;
}

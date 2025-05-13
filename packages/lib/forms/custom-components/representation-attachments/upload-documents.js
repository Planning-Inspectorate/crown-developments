import { APPLICATION_FOLDERS, buildPath, caseReferenceToFolderName } from '../../../util/sharepoint-path.js';
import { fetchPublishedApplication } from 'crowndev-portal/src/util/applications.js';
import { validateUploadedFile } from './document-validation-util.js';
import { FILE_PROPERTIES } from '../../../documents/view-model.js';
import { isValidUuidFormat } from '../../../util/uuid.js';
import { notFoundHandler } from '../../../middleware/errors.js';
import { addSessionData } from '../../../util/session.js';
import { sortByField } from '../../../util/array.js';

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
		const journeyId = res.locals?.journeyResponse?.journeyId;
		const folderPath = await createSessionSharepointFolders(
			sharePointDrive,
			logger,
			caseReference,
			appName,
			sessionId,
			applicationId,
			journeyId
		);
		const documents = await fetchDocumentsInFolderPath(sharePointDrive, folderPath);
		const totalSize = documents.reduce((sum, item) => sum + (item.size || 0), 0);
		const fileErrors = (await Promise.all(req.files.map((file) => validateUploadedFile(file, logger))))
			.flat()
			.filter(Boolean);

		if (totalSize > 1073741824) {
			fileErrors.push({
				text: 'Total file size of all attachments must be smaller than 1GB',
				href: `#upload-form`
			});
		}

		if (fileErrors.length > 0) {
			req.session.errorSummary = req.session.errorSummary || [];
			req.session.errorSummary = fileErrors;
		} else {
			for (const file of req.files) {
				try {
					await sharePointDrive.uploadDocumentToSession(folderPath, file);
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

			//TODO assign the uploaded files to the correct part of session; either myself or submitter
			// const prefix = res.locals?.journeyResponse?.answers['submittedForId'] === 'myself' ? 'myself' : 'submitter';
			addSessionData(req, applicationId, { uploadedFiles }, 'files');
		}

		const originalUrl = req.originalUrl;
		const redirectUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/upload-documents'));
		res.redirect(redirectUrl);
	};
}

// export async function deleteDocumentsController({ db, logger, sharePointDrive, appName }) {
// 	//TODO: create a delete handler in the event that the user clicks remove after the file has been uploaded
// 	// folder path: System/Sessions/Portal/session-id/application-id/journey-id
// }

async function createSessionSharepointFolders(
	sharePointDrive,
	logger,
	caseReference,
	appName,
	sessionId,
	applicationId,
	journeyId
) {
	const caseReferenceFolder = caseReferenceToFolderName(caseReference);
	const applicationNameFolder = appName === 'portal' ? APPLICATION_FOLDERS.PORTAL : APPLICATION_FOLDERS.MANAGE;

	const folderSteps = [
		{ name: APPLICATION_FOLDERS.SYSTEM, description: 'System folder' },
		{ name: APPLICATION_FOLDERS.SESSIONS, description: 'Session folder' },
		{ name: applicationNameFolder, description: `${applicationNameFolder} folder` },
		{ name: sessionId, description: 'Session ID folder' },
		{ name: applicationId, description: 'Application ID folder' },
		{ name: journeyId, description: `"${journeyId}" folder` }
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

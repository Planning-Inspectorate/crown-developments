import { APPLICATION_FOLDERS, buildPath, caseReferenceToFolderName } from '../../../util/sharepoint-path.js';
import { fetchPublishedApplication } from 'crowndev-portal/src/util/applications.js';
import { validateUploadedFile } from './document-validation-util.js';
import { FILE_PROPERTIES } from '../../../documents/view-model.js';

export function uploadDocumentsController({ db, logger, sharePointDrive, appName }) {
	return async (req, res) => {
		const applicationId = req.params.applicationId;
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
		const documents = await sharePointDrive.getItemsByPath(folderPath, [['$select', FILE_PROPERTIES.join(',')]]);
		const totalSize = documents.reduce((sum, item) => sum + (item.size || 0), 0);

		if (totalSize > 1073741824) {
			throw new Error(); //TODO: update error message here
		}

		const fileErrors = (await Promise.all(req.files.map((file) => validateUploadedFile(file)))).flat().filter(Boolean);

		if (fileErrors.length > 0) {
			throw new Error(); //TODO: update error message here
		}

		req.files.forEach((file) => {
			try {
				sharePointDrive.uploadDocumentToSession(folderPath, file);
			} catch (error) {
				const filename = file.originalname;
				logger.error(
					{ error, caseReference, sessionId },
					`Error uploading file: ${filename} to Sharepoint folder: ${folderPath}`
				);
				throw new Error(`Failed to upload file: ${filename} to Sharepoint folder: ${folderPath}`);
			}
		});

		// add docs to the journey so they can be accessed in the doc list and CYA page
		// once documents upload - redirect back to the upload docs page

		const originalUrl = req.originalUrl;
		const redirectUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/upload-documents'));
		res.redirect(redirectUrl);
	};
}

//TODO: create a delete handler in the event that the user clicks remove after the file has been uploaded
// folder path: System/Sessions/Portal/session-id/application-id/journey-id

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

import {
	APPLICATION_FOLDERS,
	representationSessionFolderPath,
	systemFolderPath
} from '../../../util/sharepoint-path.js';
import { fetchPublishedApplication } from 'crowndev-portal/src/util/applications.js';
import fileType from 'file-type';
import { getDocuments } from '../../../documents/get.js';

const ALLOWED_MIME_TYPES = new Set([
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/tiff',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'doc', 'docx', 'xls', 'xlsx']);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function uploadDocumentsController({ db, logger, sharePointDrive }) {
	return async (req, res) => {
		const crownDevelopment = await fetchPublishedApplication({
			id: req.params.applicationId,
			db,
			args: {}
		});

		const caseReference = crownDevelopment.reference;
		const sessionId = req.sessionID;

		await createSessionSharepointFolders(sharePointDrive, logger, caseReference, sessionId);

		const folderPath = `${representationSessionFolderPath(caseReference)}/have-your-say`;
		const documents = await getDocuments({
			sharePointDrive,
			folderPath,
			logger,
			id: crownDevelopment.id
		});
		const totalSize = documents.reduce((sum, item) => sum + (item.size || 0), 0);

		//TODO: check total size of all files in folder: 1GB max
		if (totalSize > '1GB') {
			//TODO: update the if statement
			throw new Error(); //TODO: update error message here
		}

		const fileErrors = (await Promise.all(req.files.map((file) => validateUploadedFile(file)))).filter(Boolean);

		if (fileErrors.length > 0) {
			throw new Error(); //TODO: update error message here
		}

		//TODO: once all of the above checked, then add files into newly created sharepoint folder
		// add some try/catch error handling to the calls to sharepoint
		req.files.forEach((file) => sharePointDrive.uploadDocumentToSession(folderPath, file));

		// add docs to the journey so they can be accessed in the doc list and CYA page
		// once documents upload - redirect back to the upload docs page
		const originalUrl = req.originalUrl;
		const redirectUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/upload-documents'));
		res.redirect(redirectUrl);
	};
}

//TODO: create a delete handler in the event that the user clicks remove after the file has been uploaded

async function createSessionSharepointFolders(sharePointDrive, logger, caseReference, sessionId) {
	const folders = [
		{
			path: caseReference,
			name: APPLICATION_FOLDERS.SYSTEM,
			description: 'System folder'
		},
		{
			path: systemFolderPath(caseReference),
			name: APPLICATION_FOLDERS.SESSIONS,
			description: 'Session folder'
		},
		{
			path: representationSessionFolderPath(caseReference),
			name: 'have-your-say',
			description: '"have-your-say" folder'
		}
	];

	for (const { path, name, description } of folders) {
		await createFolder({
			sharePointDrive,
			logger,
			caseReference,
			sessionId,
			path,
			folderName: name,
			description
		});
	}
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

export async function validateUploadedFile(file) {
	const { originalname, mimetype, buffer, size } = file;

	if (!ALLOWED_MIME_TYPES.has(mimetype)) {
		return `${originalname}: The attachment must be PDF, PNG, DOC, DOCX, JPG, JPEG, TIF, TIFF, XLS or XLSX`;
	}

	const fileTypeResult = await fileType.fromBuffer(buffer);
	if (!fileTypeResult) {
		return `${originalname}: Could not determine file type from signature`;
	}

	const { mime, ext } = fileTypeResult;

	if (ext === 'zip' || mime === 'application/zip') {
		return `${originalname}: The attachment must not be a zip file`;
	}

	if (!ALLOWED_MIME_TYPES.has(mime) || !ALLOWED_EXTENSIONS.has(ext)) {
		return `${originalname}: File signature mismatch: got ${mime} (${ext})`;
	}

	if (size > MAX_FILE_SIZE) {
		return `${originalname}: The attachment must be smaller than 20MB`;
	}

	return '';
}

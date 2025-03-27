export const APPLICATION_FOLDERS = Object.freeze({
	PUBLISHED: 'Published',
	RECEIVED: 'Received',
	REPRESENTATION_ATTACHMENTS: 'RepresentationAttachments'
});

/**
 * Returns the published folder path for the given case reference
 *
 * @param {string} caseReference
 * @returns {string}
 */
export function publishedFolderPath(caseReference) {
	return buildPath(caseReferenceToFolderName(caseReference), APPLICATION_FOLDERS.PUBLISHED);
}

/**
 * Returns the published reps attachments folder root path for the given case reference
 *
 * @param {string} caseReference
 * @returns {string}
 */
export function publishedRepresentationsAttachmentsRootFolderPath(caseReference) {
	return buildPath(publishedFolderPath(caseReference), APPLICATION_FOLDERS.REPRESENTATION_ATTACHMENTS);
}

/**
 * Returns the published reps attachments folder path for the given case reference and representation reference
 *
 * @param {string} caseReference
 * @param {string} repReference
 * @returns {string}
 */
export function publishedRepresentationsAttachmentsFolderPath(caseReference, repReference) {
	return buildPath(publishedFolderPath(caseReference), APPLICATION_FOLDERS.REPRESENTATION_ATTACHMENTS, repReference);
}

/**
 * Converts caseReference (which uses slashes) into folder name (which uses dashes)
 *
 * @param {string} name
 * @returns {string}
 */
export function caseReferenceToFolderName(name) {
	return name.replaceAll('/', '-');
}

/**
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {string} caseRootName
 * @param {'Applicant' | 'LPA' } [user] Requires type = Received
 * @returns {Promise<string>}
 */
export async function getSharePointReceivedPathId(sharePointDrive, { caseRootName, user }) {
	if (!user) {
		throw new Error('Invalid path');
	}
	const folderPath = buildPath(caseRootName, APPLICATION_FOLDERS.RECEIVED);
	const receivedFolders = await sharePointDrive.getItemsByPath(folderPath, []);

	const userFolder = receivedFolders.find((folder) => folder.name === user);

	if (!userFolder || !userFolder.id) {
		throw new Error(`Folder not found in this path: ${folderPath}`);
	}

	return userFolder.id;
}

/**
 * @param {string} parts
 * @returns {string}
 */
function buildPath(...parts) {
	return parts.join('/');
}

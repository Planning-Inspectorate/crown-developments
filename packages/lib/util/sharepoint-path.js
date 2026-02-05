export const APPLICATION_FOLDERS = Object.freeze({
	MANAGE: 'Manage',
	PORTAL: 'Portal',
	PUBLISHED: 'Published',
	RECEIVED: 'Received',
	REPRESENTATION_ATTACHMENTS: 'RepresentationAttachments',
	REPRESENTATIONS: 'Representations',
	SESSIONS: 'Sessions',
	SYSTEM: 'System'
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
 * Return the representation attachments folder path for the given case reference and representation reference
 * @param {string} caseReference
 * @param {string} repReference
 * @returns {string} path to the representation attachments folder
 */
export function representationAttachmentsFolderPath(caseReference, repReference) {
	return buildPath(
		caseReferenceToFolderName(caseReference),
		APPLICATION_FOLDERS.SYSTEM,
		APPLICATION_FOLDERS.REPRESENTATIONS,
		repReference
	);
}

/**
 * Returns the representation attachments folder path for the given case reference
 * @param { string } caseReference
 * @returns { string }
 */
export function representationFolderPath(caseReference) {
	return buildPath(
		caseReferenceToFolderName(caseReference),
		APPLICATION_FOLDERS.SYSTEM,
		APPLICATION_FOLDERS.REPRESENTATIONS
	);
}

export function representationSessionFolderPath(caseReference, applicationNameFolder, sessionId) {
	return buildPath(
		caseReferenceToFolderName(caseReference),
		APPLICATION_FOLDERS.SYSTEM,
		APPLICATION_FOLDERS.SESSIONS,
		applicationNameFolder,
		sessionId
	);
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
	const receivedFolders = await sharePointDrive.getItemsByPath(folderPath);

	const userFolder = receivedFolders.find((folder) => folder.name === user);

	if (!userFolder || !userFolder.id) {
		throw new Error(`Folder not found in this path: ${folderPath}`);
	}

	return userFolder.id;
}

/**
 * Grant access to the case "Received" folder and return invite link webUrl for LPA
 *
 * @param {sharePointDrive} sharePointDrive
 * @param {object} crownDevelopment
 * @param {string} caseRootName
 * @returns {Promise<string|null>}
 */
export async function grantLpaSharePointAccess(sharePointDrive, crownDevelopment, caseRootName) {
	const lpaReceivedFolderId = await getSharePointReceivedPathId(sharePointDrive, {
		caseRootName,
		user: 'LPA'
	});

	const lpaEmails = [crownDevelopment?.Lpa?.email, crownDevelopment?.SecondaryLpa?.email].filter(Boolean);
	if (lpaEmails.length === 0) {
		throw new Error('No LPA emails provided');
	}
	if (lpaEmails.length) {
		const users = lpaEmails.map((email) => ({ email, id: '' }));
		await sharePointDrive.addItemPermissions(lpaReceivedFolderId, { role: 'write', users });
	}

	const inviteLink = await sharePointDrive.fetchUserInviteLink(lpaReceivedFolderId);
	return inviteLink?.link?.webUrl || inviteLink?.webUrl || null;
}

/**
 * @param {string} parts
 * @returns {string}
 */
export function buildPath(...parts) {
	return parts.join('/');
}

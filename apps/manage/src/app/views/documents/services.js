/**
 * @typedef {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive } SharePointDrive
 */

/**
 *
 * @param {string} caseReference
 * @param {SharePointDrive} sharepointDrive
 * @returns
 */
export async function getReceivedAppellantDocuments(caseReference, sharepointDrive) {
	return sharepointDrive.getItemsByPath(`${caseReference}/Received/Applicant`);
}

/**
 *
 * @param {string} caseReference
 * @param {SharePointDrive} sharepointDrive
 * @returns
 */
export async function getReceivedLpaDocuments(caseReference, sharepointDrive) {
	return sharepointDrive.getItemsByPath(`${caseReference}/Received/LPA`);
}

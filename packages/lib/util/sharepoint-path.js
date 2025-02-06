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

	const receivedFolders = await sharePointDrive.getItemsByPath(`${caseRootName}/Received`, []);

	const userFolder = receivedFolders.find((folder) => folder.name === user);

	if (!userFolder || !userFolder.id) {
		throw new Error(`Folder not found in this path: ${caseRootName}/Received`);
	}

	return userFolder.id;
}

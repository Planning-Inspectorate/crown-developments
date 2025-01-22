/**
 * Converts caseReference (which uses slashes) into folder name (which uses dashes)
 *
 * @param {string} name
 * @returns {string}
 */
export function caseReferenceToFolderName(name) {
	return name.replaceAll('/', '-');
}

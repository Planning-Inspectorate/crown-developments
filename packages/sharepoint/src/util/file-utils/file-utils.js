/**
 * Cleans up a fileName string to ensure it is safe for use in sharepoint.
 * SharePoint disallows certain characters in file and folder names.
 * To avoid errors when uploading files we sanitise the fileName
 *
 * @param {string} fileName
 * @returns {string} sanitised fileName
 */
export function sanitiseFileName(fileName) {
	// replace illegal characters with underscores
	const cleaned = fileName.replace(/["*:<>?/\\|#]/g, '_');
	// trim trailing dots and spaces
	const trimmed = cleaned.replace(/[.\s]+$/, '');

	if (trimmed.startsWith('~$')) {
		// remove Microsoft Office temp file prefix if present
		return trimmed.replace(/^~\$/, '');
	}

	return trimmed;
}

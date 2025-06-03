/**
 * Add configuration values to locals.
 * @param {{isRepsUploadDocsLive: boolean, appName: string}} params
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({ isRepsUploadDocsLive, appName }) {
	return (req, res, next) => {
		res.locals.config = {
			isRepsUploadDocsLive,
			appName
		};
		next();
	};
}

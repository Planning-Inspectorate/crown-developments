/**
 * Add configuration values to locals.
 * @param {{isRepsUploadDocsLive: boolean}} params
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({ isRepsUploadDocsLive }) {
	return (req, res, next) => {
		res.locals.config = {
			isRepsUploadDocsLive
		};
		next();
	};
}

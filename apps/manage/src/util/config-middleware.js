/**
 * Add configuration values to locals.
 * @param {{appName: string}} params
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({ appName }) {
	return (req, res, next) => {
		res.locals.config = {
			appName
		};
		next();
	};
}

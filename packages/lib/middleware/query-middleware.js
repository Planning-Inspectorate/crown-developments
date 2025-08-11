/**
 * Clears empty query parameters from the request.
 * If any query parameter has an empty value, it will be removed.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function cleanEmptyQueryParams(req, res, next) {
	const url = new URL(req.originalUrl, `http://${req.headers.host}`);
	const keysToDelete = [];
	for (const [key, value] of url.searchParams.entries()) {
		if (value === '') {
			keysToDelete.push(key);
		}
	}
	if (keysToDelete.length > 0) {
		for (const key of keysToDelete) {
			url.searchParams.delete(key);
		}
		return res.redirect(url.pathname + url.search);
	}
	return next();
}

/**
 * Trims ? from empty query parameters from the request.
 * If the query is empty and the original URL ends with '?', redirect to the path without the query.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function trimEmptyQuery(req, res, next) {
	if (Object.keys(req.query).length === 0 && req.originalUrl.endsWith('?')) {
		const redirectPath = req.path;
		if (/^\/[a-zA-Z0-9/_-]*$/.test(redirectPath)) {
			return res.redirect(redirectPath);
		}
		return res.redirect('/');
	}
	return next();
}

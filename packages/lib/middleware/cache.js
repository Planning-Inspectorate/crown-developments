/**
 * @type {import('express').Handler}
 */
export function cacheNoStoreMiddleware(req, res, next) {
	res.set('Cache-Control', 'no-store');
	next();
}

/**
 * @type {import('express').Handler}
 */
export function cacheNoCacheMiddleware(req, res, next) {
	res.set('Cache-Control', 'no-cache');
	next();
}

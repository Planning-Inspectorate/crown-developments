/**
 * Caches dynamic content for a specified amount of time. The cache control value is defined in the service configuration.
 * This middleware should be used for routes that serve dynamic content that can be cached for a short period of time, such as the applications list page.
 *
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildCachingDynamicContentMiddleware(service) {
	return (req, res, next) => {
		if (service.dynamicCacheControl.enabled) {
			// If the dynamic cache control is enabled, set the cache control header to the value defined in the service configuration.
			res.setHeader('Cache-Control', `public, max-age=${service.dynamicCacheControl.maxAge}`);
		}
		next();
	};
}

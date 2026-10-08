import type { S62APortalService } from '#service';
import type { Handler } from 'express';

/**
 * Simple firewall error page
 * @param service
 */
export function firewallErrorPage(service: S62APortalService): Handler {
	return (_, res) => {
		service.logger.warn('Firewall error page requested');
		return res.render('views/static/error/firewall-error.njk', {
			pageTitle: 'Sorry, there is a problem with the service'
		});
	};
}

/**
 * Catch-all 404 page.
 * Registered last in the app router so it runs before core's default notFoundHandler,
 * which can't render the contact link required by the AC.
 */
export const notFoundPage: Handler = (_, res) => {
	res.status(404);
	return res.render('views/static/error/not-found-error.njk', {
		pageTitle: 'Page not found'
	});
};

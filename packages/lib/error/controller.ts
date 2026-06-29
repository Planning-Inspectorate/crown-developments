import type { BaseService } from '@pins/crowndev-lib/app/base-service.ts';
import type { Handler } from 'express';

/**
 * Simple firewall error page
 * @param service
 */
export function firewallErrorPage(service: BaseService): Handler {
	return (req, res) => {
		service.logger.warn('Firewall error page requested');
		return res.render('views/static/error/firewall-error.njk', {
			pageTitle: 'Firewall Error'
		});
	};
}

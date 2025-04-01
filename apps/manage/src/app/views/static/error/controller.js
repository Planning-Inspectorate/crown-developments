export function firewallErrorPage({ logger }) {
	return async (req, res) => {
		logger.warn('Firewall error page requested');
		return res.render('views/static/error/firewall-error.njk', {
			pageTitle: 'Firewall Error'
		});
	};
}

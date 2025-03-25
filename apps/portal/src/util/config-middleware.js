/**
 * Add configuration values to locals.
 * @param {Object} params
 * @param {import('../app/config-types.js').Config} params.config
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({ config }) {
	return (req, res, next) => {
		const path = req.path;

		const links = [
			{
				text: 'Home',
				href: '/'
			},
			{
				text: 'All Applications',
				href: '/applications'
			}
		];

		res.locals.config = {
			headerTitle: 'Find a Crown Development Application',
			primaryNavigationLinks: links.map((l) => {
				const link = { current: false, ...l };
				link.current = link.href === path;
				return link;
			}),
			haveYourSayServiceName: 'Have your say on a Crown Development Application',
			isLive: config.featureFlags?.isLive
		};
		next();
	};
}

/**
 * Add configuration values to locals.
 * @type {import('express').Handler}
 */
export function addLocalsConfiguration(req, res, next) {
	const path = req.path;

	const links = [
		{
			text: 'Home',
			href: '/'
		},
		{
			text: 'All Applications',
			href: '/applications'
		},
		{
			text: 'More Information',
			href: '/more-information'
		}
	];

	res.locals.config = {
		headerTitle: 'Crown Developments',
		primaryNavigationLinks: links.map((l) => {
			const link = { current: false, ...l };
			link.current = link.href === path;
			return link;
		})
	};
	next();
}

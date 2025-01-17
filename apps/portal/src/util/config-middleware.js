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
			text: 'All Projects',
			href: '/projects'
		},
		{
			text: 'More Information',
			href: '/more-infromation'
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

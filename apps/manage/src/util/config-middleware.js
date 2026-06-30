/**
 * Add configuration values to locals.
 * @param {{appName: string}} params
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({ appName }) {
	return (req, res, next) => {
		const path = req.path;

		const links = [
			{
				text: 'Home',
				href: '/s62a/cases'
			},
			{
				text: 'Create new case',
				href: '/s62a/cases/create-a-case/pre-application-or-application'
			},
			{
				text: 'Sign out',
				href: '/s62a/auth/signout'
			}
		];

		res.locals.config = {
			appName,
			headerTitle: 'Manage Section 62A applications',
			isLive: true,
			inBeta: false,
			primaryNavigationLinks: links.map((link) => ({
				...link,
				current: link.href === path
			}))
		};

		next();
	};
}

/**
 * Add configuration values to locals.
 * @param {{appName: string}} params
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({ appName }) {
	return (req, res, next) => {
		const path = req.path;

		const s62aLinks = [
			{
				text: 'All cases',
				href: '/s62a/cases'
			},
			{
				text: 'Create new case',
				href: '/s62a/cases/create-a-case/questions/pre-application-or-application'
			},
			{
				text: 'Sign out',
				href: '/s62a/auth/signout'
			}
		];

		const crownLinks = [
			{
				text: 'All Cases',
				href: '/crown/cases'
			},
			{
				text: 'Sign out',
				href: '/auth/signout'
			}
		];

		const links = res.locals.isS62A ? s62aLinks : crownLinks;

		const headerTitle = res.locals.isS62A
			? 'Manage Section 62A applications'
			: 'Manage a Crown Development Application';

		res.locals.config = {
			appName,
			headerTitle: headerTitle,
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

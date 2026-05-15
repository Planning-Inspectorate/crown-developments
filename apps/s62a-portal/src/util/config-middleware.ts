import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		const path = req.path;

		const links = [
			{
				text: 'Home',
				href: '/'
			},
			{
				text: 'Another page',
				href: '/another-page'
			}
		];

		res.locals.config = {
			cspNonce: res.locals.cspNonce as string,
			headerTitle: 'A template service',
			inBeta: false,
			footerLinks: [
				{
					text: 'Terms and conditions',
					href: '/terms-and-conditions'
				},
				{
					text: 'Accessibility statement',
					href: '/accessibility-statement'
				},
				{
					text: 'Privacy',
					href: 'https://www.gov.uk/government/publications/planning-inspectorate-privacy-notices/customer-privacy-notice'
				},
				{
					text: 'Cookies',
					href: '/cookies'
				},
				{
					text: 'Contact',
					href: '/contact'
				}
			],
			primaryNavigationLinks: links.map((l) => {
				const link = { current: false, ...l };
				link.current = link.href === path;
				return link;
			})
		};
		next();
	};
}

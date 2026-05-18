import type { S62APortalService } from '#service';
import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(service: S62APortalService): Handler {
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
			headerTitle: 'Find a Section 62A Portal',
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
			isLive: service.isLive,
			primaryNavigationLinks: links.map((link) => ({
				...link,
				current: link.href === path
			})),
			serviceFeedbackUrl: '#'
		};
		next();
	};
}

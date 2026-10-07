import type { S62APortalService } from '#service';
import type { Handler } from 'express';
import type { Manifest } from '@pins/crowndev-lib/util/manifest.ts';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(service: S62APortalService, manifest: Manifest): Handler {
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
			headerTitle: 'Find a local planning application made to the Planning Inspectorate',
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
			serviceFeedbackUrl: 'https://forms.cloud.microsoft/e/YdJSUB4h4v',
			manifest: {
				styleFile: manifest['style.css'] ?? 'style.css',
				govukJsFile: manifest['govuk-frontend.min.js'] ?? 'govuk-frontend.min.js',
				mojJsFile: manifest['moj-frontend.min.js'] ?? 'moj-frontend.min.js',
				autocompleteStyleFile: manifest['accessible-autocomplete.min.css'] ?? 'accessible-autocomplete.min.css',
				autocompleteJsFile: manifest['accessible-autocomplete.min.js'] ?? 'accessible-autocomplete.min.js'
			}
		};
		next();
	};
}

/**
 * Add configuration values to locals.
 * @param {import('#service').PortalService} service
 * @param {import('@pins/crowndev-lib/util/manifest.ts').Manifest} manifest
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration(service, manifest) {
	return (req, res, next) => {
		const path = req.path;

		const links = [
			{
				text: 'All applications',
				href: '/applications'
			},
			{
				text: 'Detailed information',
				href: '/detailed-information'
			}
		];

		res.locals.config = {
			appName: service.appName,
			cspNonce: res.locals.cspNonce,
			headerTitle: 'Find a Crown development application',
			headerUrl: '/',
			footerLinks: [
				{
					text: 'Terms and conditions',
					link: '/terms-and-conditions'
				},
				{
					text: 'Accessibility statement',
					link: '/accessibility-statement'
				},
				{
					text: 'Privacy',
					link: 'https://www.gov.uk/government/publications/planning-inspectorate-privacy-notices/customer-privacy-notice'
				},
				{
					text: 'Cookies',
					link: '/cookies'
				},
				{
					text: 'Contact',
					link: '/contact'
				}
			],
			primaryNavigationLinks: links.map((l) => {
				const link = { current: false, ...l };
				link.current = link.href === path;
				return link;
			}),
			haveYourSayServiceName: 'Have your say on a Crown development application',
			isLive: service.isLive,
			inBeta: true,
			contactEmail: service.contactEmail,
			googleAnalyticsId: service.googleAnalyticsId,
			googleAnalyticsCookieDomain: service.appHostname,
			serviceFeedbackUrl:
				'https://forms.office.com/Pages/ResponsePage.aspx?id=mN94WIhvq0iTIpmM5VcIjUURDJ3wGfJKiFN5NOmxUcNURTNBUTQzS1JOVEtWSkJSR1I4MjNVTFBDQy4u',
			serviceEOIUrl:
				'https://forms.office.com/Pages/ResponsePage.aspx?id=mN94WIhvq0iTIpmM5VcIjUURDJ3wGfJKiFN5NOmxUcNUMElBMjI3RUQ3WEg5STdNMzk2NkhLUTcwTi4u',
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

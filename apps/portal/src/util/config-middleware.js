/**
 * Add configuration values to locals.
 * @param {{isLive: boolean, isRepsUploadDocsLive: boolean, contactEmail: string, googleAnalyticsId?: string, appName: string}} params
 * @returns {import('express').Handler}
 */
export function addLocalsConfiguration({
	isLive,
	isRepsUploadDocsLive,
	contactEmail,
	googleAnalyticsId,
	appHostname,
	appName
}) {
	return (req, res, next) => {
		const path = req.path;

		const links = [
			{
				text: 'All Applications',
				href: '/applications'
			}
		];

		res.locals.config = {
			appName,
			cspNonce: res.locals.cspNonce,
			headerTitle: 'Find a Crown Development Application',
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
			}),
			haveYourSayServiceName: 'Have your say on a Crown Development Application',
			isLive,
			isRepsUploadDocsLive,
			contactEmail,
			googleAnalyticsId,
			googleAnalyticsCookieDomain: appHostname,
			serviceFeedbackUrl: 'https://forms.office.com/e/qea9t1nt8M'
		};
		next();
	};
}

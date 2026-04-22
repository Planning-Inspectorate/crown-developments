export function buildDetailedInformationPage() {
	return (req, res) => {
		const chevrons = [
			{
				title: 'Procedural guidance',
				href: 'https://www.gov.uk/government/publications/crown-development-applications-procedural-guide',
				description: 'The roles and responsibilities of each party in the non-urgent Crown development process.'
			},
			{
				title: 'Application documents',
				href: 'https://www.gov.uk/government/publications/planning-application-forms-templates-for-local-planning-authorities',
				description: 'Resources for submitting a Crown development application.'
			},
			{
				title: 'Legislation information',
				href: 'https://www.legislation.gov.uk/uksi/2025/409/contents/made',
				description: 'View The Town and Country Planning Order 2025 to understand our legal duties.'
			},
			{
				title: 'Words we use',
				href: 'https://www.gov.uk/government/publications/words-we-use-to-talk-about-crown-development-applications',
				description: 'Definitions of the words we use to talk about Crown development applications.'
			},
			{
				title: 'Give us feedback',
				href: res.locals.config.serviceFeedbackUrl || '',
				description: 'Help us improve our service by giving us feedback.'
			},
			{
				title: 'Take part in user research',
				href: res.locals.config.serviceEOIUrl || '',
				description: 'Express your interest in taking part in future user research.'
			}
		];
		return res.render('views/static/detailed-information/view.njk', { chevrons });
	};
}

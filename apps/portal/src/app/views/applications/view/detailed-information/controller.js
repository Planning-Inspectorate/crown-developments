export function getDetailedInformationController(req, res) {
	const pageTitle = 'Detailed Information';
	const introDescription =
		'Find further legislation and guidance resources. Information on this page may be useful for those applying to use the service and the general public.';
	const chevrons = [
		{
			title: 'Procedural guidance',
			href: 'https://www.gov.uk/government/publications/crown-development-applications-procedural-guide',
			description: 'The roles and responsibilities of each party in the non-urgent Crown development process'
		},
		{
			title: 'Applications documents',
			href: 'https://www.gov.uk/government/publications/planning-application-forms-templates-for-local-planning-authorities',
			description: 'Resources for submitting a Crown development application'
		},
		{
			title: 'Legislation information',
			href: 'https://www.legislation.gov.uk/uksi/2025/409/contents/made',
			description: 'View The Town and Country Planning Order 2025 to understand our legal duties'
		}
	];
	return res.render('views/applications/view/detailed-information/view.njk', { pageTitle, introDescription, chevrons });
}
export function buildDetailedInformationPage() {
	return async (req, res) => {
		getDetailedInformationController(req, res);
	};
}

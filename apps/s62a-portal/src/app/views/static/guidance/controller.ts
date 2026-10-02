import type { Handler } from 'express';

/**
 * Builds the  Guidance page controller.
 */
export function buildGuidancePage(): Handler {
	return (req, res) => {
		const chevrons = [
			{
				title: 'Procedural guidance',
				href: 'https://www.gov.uk/government/publications/planning-applications-process-section-62a-authorities-in-special-measures/procedural-guidance-for-section-62a-authorities-in-special-measures',
				description:
					'Read the rules, fees, and responsibilities for applicants, local councils, and the public under Section 62A.'
			},
			{
				title: 'Applications made before 2026',
				href: 'https://www.gov.uk/government/publications/planning-applications-process-section-62a-authorities-in-special-measures#:~:text=Applications%20submitted',
				description: 'Search and view planning applications submitted before 2026.'
			},
			{
				title: 'Legislation information',
				href: 'https://www.legislation.gov.uk/uksi/2021/746/contents/made',
				description:
					'View the Town and Country Planning Order 2021 to see the legal framework governing Section 62A applications.'
			},
			{
				title: 'Designated authorities',
				href: 'https://www.gov.uk/guidance/planning-applications-s62a#current-designations-for-major-applications:~:text=on%20their%20behalf.-,Current%20designations%20for%20major%20applications',
				description:
					'View the list of current designated authorities, where eligible planning applications can, if the applicant chooses, be made directly to the Secretary of State.   '
			}
		];

		const containerStartText = {
			title: 'Guidance',
			body: 'Find further legislation and guidance resources. Information on this page may be useful for those applying to use the service and the general public.'
		};

		res.render('views/static/guidance/view.njk', {
			chevrons,
			containerStartText
		});
	};
}

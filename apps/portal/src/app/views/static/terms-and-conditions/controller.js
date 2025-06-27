import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

/**
 * Builds the Terms & Conditions page controller.
 *
 * @returns {import('express').Handler} - The Terms & Conditions page controller.
 */
export function buildTermsAndConditionsPage() {
	return (req, res) => {
		res.render('views/static/terms-and-conditions/view.njk', {
			pageTitle: 'Terms and Conditions',
			lastUpdatedDate: formatDateForDisplay(new Date('2025-03-26T00:00:00Z'))
		});
	};
}

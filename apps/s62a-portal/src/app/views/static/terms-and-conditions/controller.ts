import type { Handler } from 'express';

/**
 * Date the terms and conditions copy was last changed.
 * Update this whenever the copy in view.njk changes.
 */
export const TERMS_LAST_UPDATED = new Date('2026-10-06T00:00:00Z');

/**
 * Format a date for display, e.g. "6 October 2026" (GOV.UK style)
 */
export function formatLastUpdated(date: Date): string {
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/London'
	}).format(date);
}

/**
 * Builds the Terms and conditions page controller.
 */
export function buildTermsAndConditionsPage(): Handler {
	return (req, res) => {
		res.render('views/static/terms-and-conditions/view.njk', {
			pageTitle: 'Terms and conditions',
			lastUpdatedDate: formatLastUpdated(TERMS_LAST_UPDATED)
		});
	};
}

import type { Handler } from 'express';

/**
 * Builds the Contact Us page controller.
 */
export function buildContactUsPage(): Handler {
	return (req, res) => {
		res.render('views/static/contact/view.njk', {
			pageTitle: 'Contact us'
		});
	};
}

/**
 * Builds the Contact Us page controller.
 *
 * @returns {import('express').Handler} - The Contact Us page controller.
 */
export function buildContactUsPage() {
	return (req, res) => {
		res.render('views/static/contact/view.njk', {
			pageTitle: 'Contact us'
		});
	};
}

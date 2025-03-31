/**
 * Builds the Accessibility Statement page controller.
 *
 * @returns {import('express').Handler} - The Accessibility Statement page controller.
 */
export function buildAccessibilityStatementPage() {
	return (req, res) => {
		res.render('views/static/accessibility-statement/view.njk', {
			pageTitle: 'Accessibility Statement'
		});
	};
}

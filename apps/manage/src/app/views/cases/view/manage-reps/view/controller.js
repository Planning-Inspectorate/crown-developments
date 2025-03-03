/**
 * Placeholder
 * @type {import('express').Handler}
 */
export function viewRep(req, res) {
	res.render('views/cases/view/manage-reps/view/view.njk', {
		backLink: '#',
		pageTitle: 'View representation',
		baseUrl: req.baseUrl
	});
}

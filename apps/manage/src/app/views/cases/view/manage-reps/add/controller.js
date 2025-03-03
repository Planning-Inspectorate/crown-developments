/**
 * Placeholder
 * @type {import('express').Handler}
 */
export function addRep(req, res) {
	res.render('views/cases/view/manage-reps/add/view.njk', {
		backLink: '.',
		pageTitle: 'Add a representation',
		baseUrl: req.baseUrl
	});
}

/**
 * Placeholder
 * @type {import('express').Handler}
 */
export function reviewRep(req, res) {
	res.render('views/cases/view/manage-reps/review/view.njk', {
		backLink: '#',
		pageTitle: 'Review representation',
		baseUrl: req.baseUrl
	});
}

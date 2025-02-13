/**
 * Render the have-your-say placeholder page
 *
 * @type {import('express').RequestHandler}
 */
export function viewHaveYourSayPage(req, res) {
	const id = req.params.applicationId;
	res.render('views/applications/view/have-your-say/view.njk', {
		id,
		pageTitle: 'Placeholder for Have Your Say page'
	});
}

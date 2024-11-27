/**
 * Render the home page
 *
 * @type {import('express').RequestHandler}
 */
export function viewHomepage(req, res) {
	res.render('views/home/view.njk', {
		pageTitle: 'Welcome home'
	});
}

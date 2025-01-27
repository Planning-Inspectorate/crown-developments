/**
 * Render the application information page
 *
 * @type {import('express').RequestHandler}
 */
export function viewApplicationInformationPage(req, res) {
	res.render('views/info/view.njk', {
		pageCaption: 'Crown Developments',
		pageTitle: 'Application Information'
	});
}

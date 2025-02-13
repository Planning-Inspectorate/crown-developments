/**
 * Render the Documents placeholder page
 *
 * @type {import('express').RequestHandler}
 */
export function viewDocumentsPage(req, res) {
	const id = req.params.applicationId;
	res.render('views/applications/view/documents/view.njk', {
		id,
		pageTitle: 'Placeholder for Documents page'
	});
}

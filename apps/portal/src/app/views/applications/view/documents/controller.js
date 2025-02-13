import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';

/**
 * Render the Documents placeholder page
 *
 * @type {import('express').RequestHandler}
 */
export function viewDocumentsPage(req, res) {
	const id = req.params.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		throw new Error('id format is invalid');
	}

	res.render('views/applications/view/documents/view.njk', {
		id,
		pageTitle: 'Placeholder for Documents page'
	});
}

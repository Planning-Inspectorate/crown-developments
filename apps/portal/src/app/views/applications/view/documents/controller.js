import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { applicationLinks } from '../view-model.js';

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
		return notFoundHandler(req, res);
	}

	res.render('views/applications/view/documents/view.njk', {
		id,
		pageTitle: 'Placeholder for Documents page',
		pageCaption: 'Case ref here',
		links: applicationLinks(id),
		currentUrl: req.originalUrl
	});
}

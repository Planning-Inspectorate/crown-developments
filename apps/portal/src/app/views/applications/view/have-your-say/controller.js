import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';

/**
 * Render the have-your-say placeholder page
 *
 * @type {import('express').RequestHandler}
 */
export function viewHaveYourSayPage(req, res) {
	const id = req.params.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		throw new Error('id format is invalid');
	}

	res.render('views/applications/view/have-your-say/view.njk', {
		id,
		pageTitle: 'Placeholder for Have Your Say page'
	});
}

import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { generateNewReference } from '@pins/crowndev-lib/util/random-reference.js';

/**
 * Render add representation success page
 *
 * @returns {import('express').Handler}
 */
export async function viewAddRepresentationSuccessPage(req, res) {
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	//TODO: to be replaced when representation saved on declaration - this is just a placeholder
	const representationReference = generateNewReference();

	res.render('views/cases/view/manage-reps/add/success.njk', {
		title: 'Representation added',
		bodyText: `Representation reference <br><strong>${representationReference}</strong>`,
		successBackLinkUrl: `/cases/${id}/manage-representations`,
		successBackLinkText: 'Go back to overview'
	});
}

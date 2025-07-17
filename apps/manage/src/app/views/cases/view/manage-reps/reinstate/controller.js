import { validateParams } from '../view/controller.js';

export function buildReinstateRepConfirmation() {
	return async (req, res) => {
		const { id, representationRef } = validateParams(req.params);

		return res.render('views/cases/view/manage-reps/reinstate/view.njk', {
			pageTitle: 'Reinstate representation',
			representationRef: representationRef,
			backLinkUrl: `/cases/${id}/manage-representations`
		});
	};
}

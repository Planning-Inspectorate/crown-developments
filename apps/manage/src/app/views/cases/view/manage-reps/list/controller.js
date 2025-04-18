import { representationsToViewModel } from './view-model.js';
import { clearRepReviewedSession, readRepReviewedSession } from '../review/controller.js';

/**
 * Return a handler to show the list of representations
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildListReps({ db }) {
	return async (req, res) => {
		const id = req.params.id;
		if (!id) {
			throw new Error('id param is required');
		}
		const cd = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				Representation: {
					include: { SubmittedByContact: true }
				}
			}
		});

		const repReviewed = readRepReviewedSession(req, id);
		clearRepReviewedSession(req, id);

		res.render('views/cases/view/manage-reps/list/view.njk', {
			backLink: `/cases/${req.params.id}`,
			pageCaption: cd.reference,
			pageTitle: 'Manage representations',
			baseUrl: req.baseUrl,
			...representationsToViewModel(cd.Representation),
			repReviewed
		});
	};
}

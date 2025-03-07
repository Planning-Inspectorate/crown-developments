import { representationsToViewModel } from './view-model.js';
import { clearRepUpdatedSession, readRepUpdatedSession } from '../review/controller.js';

/**
 * Return a handler to show the list of representations
 *
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
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

		const repUpdated = readRepUpdatedSession(req, id);
		clearRepUpdatedSession(req, id);

		res.render('views/cases/view/manage-reps/list/view.njk', {
			backLink: `/cases/${req.params.id}`,
			pageCaption: cd.reference,
			pageTitle: 'Manage representations',
			baseUrl: req.baseUrl,
			...representationsToViewModel(cd.Representation),
			repUpdated
		});
	};
}

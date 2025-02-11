import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { clearRepUpdatedSession, readRepUpdatedSession } from '../view/controller.js';

/**
 * Fetch the case details from the database to create the journey
 *
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Handler}
 */
export function buildListReps({ db }) {
	return async (req, res) => {
		const id = req.params.id;
		const cd = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				Representation: {
					include: { SubmittedByContact: true }
				}
			}
		});
		const repsByStatus = {};
		cd.Representation.sort((a, b) => {
			return a.submittedDate - b.submittedDate;
		});
		for (const rep of cd.Representation) {
			const byStatus = repsByStatus[rep.statusId] || (repsByStatus[rep.statusId] = []);
			byStatus.push(mapRep(rep));
		}
		const repUpdated = readRepUpdatedSession(req, id);
		clearRepUpdatedSession(req, id);
		res.render('views/cases/view/manage-reps/list/view.njk', {
			backLink: req.baseUrl,
			pageCaption: cd.reference,
			pageTitle: 'Manage representations',
			baseUrl: req.baseUrl,
			reps: {
				awaitingReview: repsByStatus[REPRESENTATION_STATUS_ID.AWAITING_REVIEW] || [],
				accepted: repsByStatus[REPRESENTATION_STATUS_ID.ACCEPTED] || [],
				rejected: repsByStatus[REPRESENTATION_STATUS_ID.REJECTED] || []
			},
			repUpdated
		});
	};
}

function mapRep(rep) {
	rep.submittedDate = formatDateForDisplay(rep.submittedDate);
	return rep;
}

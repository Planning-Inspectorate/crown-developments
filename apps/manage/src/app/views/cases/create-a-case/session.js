import { JOURNEY_ID } from './journey.js';

/**
 * When removing an applicant organisation, also remove any applicant contacts linked to it.
 *
 * @returns {import('express').Handler}
 */
export function removeApplicantContactsWhenOrganisationRemoved() {
	return (req, res, next) => {
		try {
			const { question, manageListAction, manageListItemId, manageListQuestion } = req.params;
			// Only act on the manage-list remove confirm step for applicant organisations
			if (
				question !== 'check-applicant-details' ||
				manageListAction !== 'remove' ||
				manageListQuestion !== 'confirm' ||
				typeof manageListItemId !== 'string' ||
				!manageListItemId
			) {
				return next();
			}

			const answers = req.session?.forms?.[JOURNEY_ID];
			if (!answers || typeof answers !== 'object') return next();

			const key = 'manageApplicantContactDetails';
			const existing = answers[key];

			// Filter out any contacts linked to the removed organisation.
			if (Array.isArray(existing)) {
				answers[key] = existing.filter((contact) => contact?.applicantContactOrganisation !== manageListItemId);
			}

			return next();
		} catch (e) {
			return next(e);
		}
	};
}

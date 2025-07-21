import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';

/**
 * @param {import('@prisma/client').Representation[]} reps
 * @returns {import('./types.js').ListRepsViewModel}
 */
export function representationsToViewModel(reps) {
	reps.sort((a, b) => {
		return a.submittedDate - b.submittedDate;
	});

	const repsByStatus = [];
	for (const rep of reps) {
		repsByStatus.push(representationToViewModel(rep));
	}

	return {
		reps: repsByStatus
	};
}

/**
 * @param {import('@prisma/client').Representation} rep
 * @returns {import('./types.js').ListRepViewModel}
 */
export function representationToViewModel(rep) {
	return {
		reference: rep.reference,
		submittedDate: formatDateForDisplay(rep.submittedDate),
		submittedByFullName: nameToViewModel(rep.SubmittedByContact?.firstName, rep.SubmittedByContact?.lastName) || '',
		status: rep.Status?.displayName,
		review: rep.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	};
}

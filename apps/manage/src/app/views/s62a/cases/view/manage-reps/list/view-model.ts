import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export type S62aRepresentationWithContacts = Prisma.S62aRepresentationGetPayload<{
	include: {
		SubmittedByContact: true;
		Status: true;
	};
}>;

export function representationsToViewModel(reps: S62aRepresentationWithContacts[]) {
	const sortedReps = [...reps].sort((a, b) => {
		const dateA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
		const dateB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
		return dateA - dateB;
	});

	return {
		reps: sortedReps.map(representationToViewModel)
	};
}

export function representationToViewModel(rep: S62aRepresentationWithContacts) {
	return {
		reference: rep.reference,
		submittedDate: formatDateForDisplay(rep.submittedDate),
		submittedDateSortableValue: new Date(rep.submittedDate)?.getTime() || '',
		submittedByFullName: nameToViewModel(rep.SubmittedByContact?.firstName, rep.SubmittedByContact?.lastName) || '',
		status: rep.Status?.displayName,
		review: rep.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	};
}

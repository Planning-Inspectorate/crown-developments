import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Crown representations are public from their publication day in Europe/London, not the exact timestamp.
 * The application must also pass the existing publication and expiry guards.
 */
export function areRepresentationsPublished(publishDate: Date | null | undefined): boolean {
	return Boolean(publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate)));
}

export function publicRepresentationWhere(applicationId: string) {
	return {
		applicationId,
		statusId: REPRESENTATION_STATUS_ID.ACCEPTED
	} satisfies Prisma.RepresentationWhereInput;
}

import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { isNowAfterStartDate } from '@planning-inspectorate/dynamic-forms';

export function areRepresentationsPublished(publishDate: Date | null | undefined): boolean {
	return Boolean(publishDate && isNowAfterStartDate(publishDate));
}

export function publicRepresentationWhere(applicationId: string) {
	return {
		applicationId,
		statusId: REPRESENTATION_STATUS_ID.ACCEPTED
	};
}

export function representationsPublishedWhere() {
	return { representationsPublishDate: { lte: new Date() } };
}

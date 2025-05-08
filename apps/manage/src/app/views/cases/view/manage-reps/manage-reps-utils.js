import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function generateJourneyTitle(statusId) {
	return statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW ? 'Review Representation' : 'View Representation';
}

import type { Schemas } from '@planning-inspectorate/data-model';
import type { ApplicationUpdateUncheckedCreateInput } from '@pins/crowndev-database/src/client/models/ApplicationUpdate.ts';
import { APPLICATION_UPDATE_STATUS } from '@pins/crowndev-database/src/seed/data-static.ts';

export function mapApplicationUpdatesToOdwSchema(
	input: ApplicationUpdateUncheckedCreateInput,
	caseReference: string
): Schemas.ApplicationUpdateSchema {
	if (!input.id) {
		throw new Error('id is required');
	}

	return {
		id: input.id,
		caseReference,
		caseId: input.applicationId,
		caseType: 'Crown Development',
		applicationUpdateStatus: statusIdToStatusDisplayName(input.statusId),
		details: input.details,
		firstPublished: input.firstPublished?.toString() ?? null,
		unpublishedDate: input.unpublishedDate?.toString() ?? null,
		lastEdited: input.lastEdited?.toString() ?? null
	};
}

function statusIdToStatusDisplayName(statusId: string) {
	const status = APPLICATION_UPDATE_STATUS.find((s) => s.id === statusId);
	if (!status) {
		throw new Error(`Unknown statusId: ${statusId}`);
	}
	return status.displayName;
}

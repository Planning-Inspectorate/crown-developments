import type { Schemas } from '@planning-inspectorate/data-model';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { APPLICATION_UPDATE_STATUS } from '@pins/crowndev-database/src/seed/data-static.ts';
import { CASE_TYPE } from '@pins/crowndev-lib/odw/odw-publisher.ts';

export const applicationUpdateOdwInclude = {
	Application: { select: { reference: true } }
} as const satisfies Prisma.ApplicationUpdateInclude;

export type ApplicationUpdateOdwPayload = Prisma.ApplicationUpdateGetPayload<{
	include: typeof applicationUpdateOdwInclude;
}>;

export function mapApplicationUpdatesToOdwSchema(update: ApplicationUpdateOdwPayload): Schemas.ApplicationUpdateSchema {
	return {
		id: update.id,
		caseReference: update.Application.reference,
		caseId: update.applicationId,
		caseType: CASE_TYPE.crown,
		applicationUpdateStatus: statusIdToStatusDisplayName(update.statusId),
		details: update.details,
		firstPublished: update.firstPublished?.toISOString() ?? null,
		unpublishedDate: update.unpublishedDate?.toISOString() ?? null,
		lastEdited: update.lastEdited?.toISOString() ?? null
	};
}

function statusIdToStatusDisplayName(statusId: string) {
	const status = APPLICATION_UPDATE_STATUS.find((s) => s.id === statusId);
	if (!status) {
		throw new Error(`Unknown statusId: ${statusId}`);
	}
	return status.displayName;
}

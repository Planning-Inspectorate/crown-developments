import type { Request, Response } from 'express';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication, getApplicationStatus, type ApplicationPublishStatus } from '#util/applications.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';

export type HaveYourSayPeriod = {
	start: Date | null;
	end: Date | null;
};

/**
 * View model for the shared "is the application published?" route guard.
 * This is the processed shape consumed by portal controllers.
 */
export interface PublishedApplicationViewModel {
	id: string;
	reference: string;
	haveYourSayPeriod: HaveYourSayPeriod;
	representationsPublishDate: Date | null;
	representationsPeriodEndDateFormatted: string;
	withdrawnDate: Date | null;
	applicationStatus: ApplicationPublishStatus;
	containsDistressingContent: boolean;
}

/**
 * Prisma `select` for the small subset of `CrownDevelopment` fields needed by the
 * shared "is the application published?" check used by portal route guards
 * (see `loadPublishedApplicationOr404`).
 *
 * Note: `fetchPublishedApplication` automatically adds `withdrawnDate` to any
 * provided `select`, so it is intentionally omitted here.
 */
const publishedApplicationSummarySelect = {
	reference: true,
	representationsPeriodStartDate: true,
	representationsPeriodEndDate: true,
	representationsPublishDate: true,
	containsDistressingContent: true
} as const satisfies Prisma.CrownDevelopmentSelect;

/**
 * Row shape returned by `fetchPublishedApplication` when called with
 * `publishedApplicationSummarySelect`. Includes `withdrawnDate` because
 * `fetchPublishedApplication` adds it automatically.
 */
type PublishedApplicationSummaryRow = Prisma.CrownDevelopmentGetPayload<{
	select: typeof publishedApplicationSummarySelect & { withdrawnDate: true };
}>;

/**
 * Pure mapping from the DB row returned by `fetchPublishedApplication`
 * to the view model used by portal controllers.
 */
export function toPublishedApplicationViewModel(
	row: PublishedApplicationSummaryRow,
	id: string
): PublishedApplicationViewModel {
	return {
		id,
		reference: row.reference,
		haveYourSayPeriod: {
			start: row.representationsPeriodStartDate,
			end: row.representationsPeriodEndDate
		},
		representationsPublishDate: row.representationsPublishDate,
		representationsPeriodEndDateFormatted: row.representationsPeriodEndDate
			? formatDateForDisplay(row.representationsPeriodEndDate, {
					format: 'd MMMM yyyy'
				})
			: '',
		withdrawnDate: row.withdrawnDate,
		applicationStatus: getApplicationStatus(row.withdrawnDate),
		containsDistressingContent: row.containsDistressingContent === true
	};
}

/**
 * Route guard: load the published application identified by `req.params.applicationId`,
 * returning a small view model for downstream controllers. Calls `notFoundHandler`
 * (and returns `undefined`) when the id is missing/invalid or the application is
 * not published.
 */
export async function loadPublishedApplicationOr404(
	req: Request,
	res: Response,
	db: PrismaClient
): Promise<PublishedApplicationViewModel | undefined> {
	const id = req.params?.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		notFoundHandler(req, res);
		return;
	}

	// only fetch case if published
	const row = await fetchPublishedApplication({
		db,
		id,
		args: { select: { ...publishedApplicationSummarySelect } }
	});

	if (!row) {
		notFoundHandler(req, res);
		return;
	}

	return toPublishedApplicationViewModel(row, id);
}

/**
 * Check if there are any published updates for the given application.
 */
export async function shouldDisplayApplicationUpdatesLink(db: PrismaClient, id: string): Promise<boolean> {
	const publishedAppUpdatesCount = await db.applicationUpdate.count({
		where: {
			applicationId: id,
			statusId: APPLICATION_UPDATE_STATUS_ID.PUBLISHED
		}
	});
	return publishedAppUpdatesCount > 0;
}

import { REPRESENTATION_CATEGORY_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import type { FilterSection, QueryFilters } from '@pins/crowndev-lib/filters/filter-types.ts';
import { buildFilters } from '@pins/crowndev-lib/written-representations/filters/filters.ts';
import type { Service } from '@pins/crowndev-lib/app/base-service.ts';

export async function buildS62AFilters(
	{ db, logger }: Pick<Service, 'db' | 'logger'>,
	id: string,
	queryFilters: QueryFilters
): Promise<FilterSection[]> {
	const interestedParties = REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES;
	const consultees = REPRESENTATION_CATEGORY_ID.CONSULTEES;

	let interestedPartyCount = 0;
	let consulteeCount = 0;
	let withAttachmentsCount = 0;
	let withoutAttachmentsCount = 0;

	try {
		[interestedPartyCount, consulteeCount, withAttachmentsCount, withoutAttachmentsCount] = await Promise.all([
			db.s62aRepresentation.count({
				where: { categoryId: interestedParties, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.s62aRepresentation.count({
				where: { categoryId: consultees, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.s62aRepresentation.count({
				where: { containsAttachments: true, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.s62aRepresentation.count({
				where: { containsAttachments: false, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			})
		]);
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'fetching written representations',
			logParams: { id }
		});
	}

	return buildFilters(
		queryFilters,
		interestedPartyCount,
		consulteeCount,
		withAttachmentsCount,
		withoutAttachmentsCount
	);
}

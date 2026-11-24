import { REPRESENTATION_CATEGORY_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { publicRepresentationWhere } from '../../../../util/representation-access.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import type { Service } from '@pins/crowndev-lib/app/base-service.ts';
import type { FilterSection, QueryFilters } from '@pins/crowndev-lib/filters/filter-types.ts';
import { buildFilters } from '@pins/crowndev-lib/written-representations/filters/filters.ts';

export async function buildCrownFilters(
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
			db.representation.count({
				where: { categoryId: interestedParties, ...publicRepresentationWhere(id) }
			}),
			db.representation.count({
				where: { categoryId: consultees, ...publicRepresentationWhere(id) }
			}),
			db.representation.count({
				where: { containsAttachments: true, ...publicRepresentationWhere(id) }
			}),
			db.representation.count({
				where: { containsAttachments: false, ...publicRepresentationWhere(id) }
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

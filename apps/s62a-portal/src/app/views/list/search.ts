import type { Request } from 'express';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { normaliseSearchQuery, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';

export const SEARCH_PARAM = 'searchCriteria';

export interface CarriedParam {
	name: string;
	value: string;
}

/** The trimmed search term from the query string, or an empty string */
export function getSearchValue(query: Request['query']): string {
	return (normaliseSearchQuery(query?.[SEARCH_PARAM]) ?? '').trim();
}

/**
 * One clause per search term. A case matches a term if it matches any of:
 * reference, LPA name, secondary LPA name, site postcode, or the name of an
 * applicant (organisation name, or contact first/last name).
 * Only applicants are searched (not agents), because only applicants are displayed.
 */
function termClause(term: string): Prisma.S62aCaseWhereInput {
	return {
		OR: [
			{ reference: { contains: term } },
			{ Lpa: { name: { contains: term } } },
			{ SecondaryLpa: { name: { contains: term } } },
			{ SiteAddress: { postcode: { contains: term } } },
			{
				S62aToApplicants: {
					some: {
						roleId: ORGANISATION_ROLES_ID.APPLICANT,
						OR: [
							{ Organisation: { name: { contains: term } } },
							{ Contact: { firstName: { contains: term } } },
							{ Contact: { lastName: { contains: term } } }
						]
					}
				}
			}
		]
	};
}

/** Cases that have been published */
export function buildPublishedWhere(now: Date): Prisma.S62aCaseWhereInput {
	return { S62aDates: { publishDate: { lte: now } } };
}

/** Published cases, narrowed by LPA selection and search term. Every search term must match somewhere. */
export function buildListWhere(now: Date, searchValue: string, lpaIds: string[] = []): Prisma.S62aCaseWhereInput {
	const terms = splitStringQueries(searchValue) ?? [];
	const lpaClauses: Prisma.S62aCaseWhereInput[] = lpaIds.length
		? [{ OR: [{ lpaId: { in: lpaIds } }, { secondaryLpaId: { in: lpaIds } }] }]
		: [];
	return {
		AND: [buildPublishedWhere(now), ...lpaClauses, ...terms.map(termClause)]
	};
}

/**
 * Query params to carry through the form as hidden inputs (e.g. items per page).
 * `excluded` is the params the form submits itself: the search box, the page
 * number (so a new search starts on page 1) and, on the list page, the LPA checkboxes.
 */
export function getCarriedParams(
	query: Request['query'],
	excluded: readonly string[] = [SEARCH_PARAM, 'page']
): CarriedParam[] {
	const carried: CarriedParam[] = [];
	for (const [name, value] of Object.entries(query ?? {})) {
		if (excluded.includes(name)) continue;
		const values = Array.isArray(value) ? value : [value];
		for (const v of values) {
			if (typeof v === 'string') carried.push({ name, value: v });
		}
	}
	return carried;
}

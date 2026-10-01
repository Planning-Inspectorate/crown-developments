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

/** Published cases, narrowed by the search term. Every term must match somewhere. */
export function buildListWhere(now: Date, searchValue: string): Prisma.S62aCaseWhereInput {
	const terms = splitStringQueries(searchValue) ?? [];
	return {
		AND: [{ S62aDates: { publishDate: { lte: now } } }, ...terms.map(termClause)]
	};
}

/**
 * Query params to carry through the search form as hidden inputs (items per page,
 * and later the filters). Excludes the search term itself and the page number,
 * so a new search always starts at page 1.
 */
export function getCarriedParams(query: Request['query']): CarriedParam[] {
	const carried: CarriedParam[] = [];
	for (const [name, value] of Object.entries(query ?? {})) {
		if (name === SEARCH_PARAM || name === 'page') continue;
		const values = Array.isArray(value) ? value : [value];
		for (const v of values) {
			if (typeof v === 'string') carried.push({ name, value: v });
		}
	}
	return carried;
}

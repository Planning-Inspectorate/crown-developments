/**
 * Shared util module between s62a and crown that handles the util functions
 * for the filters.
 */

interface QueryParams {
	filters?: string | string[];
}

interface ItemWithStatus {
	Status?: {
		id?: string | number;
	} | null;
}

/**
 * Grabs "filters" query param for the representation home page
 */
export function getQueryFilters(query: QueryParams = {}): string[] | undefined {
	const filters = query.filters;
	if (!filters) return undefined;
	return Array.isArray(filters) ? filters : [filters];
}

/**
 * Creates the representation specific query string
 */
export function getFiltersQueryString(queryFilters?: string[]): string | undefined {
	if (!queryFilters) return undefined;
	return queryFilters.map((s) => `&filters=${s}`).join('');
}

/**
 * Counts the total numbers of each status for a rep, for
 * use in filter
 */
export function statusCounts<T extends string | number>(
	array?: ItemWithStatus[] | null,
	statuses: T[] = []
): Record<T, number> {
	const counts = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<T, number>;

	array?.forEach((item) => {
		const statusId = item.Status?.id;
		if (statusId !== undefined && statusId in counts) {
			counts[statusId as T]++;
		}
	});

	return counts;
}

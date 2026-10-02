import type { Request } from 'express';
import type { S62APortalService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { sanitiseQueryToStringArray } from '@pins/crowndev-lib/filters/filter-utils.ts';
import { buildUrlWithParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';

export const LPA_PARAM = 'lpa';
const LPA_FILTER_LABEL = 'Local planning authority';

export interface LpaOption {
	id: string;
	name: string;
	count: number;
}

export interface LpaFilterItem {
	value: string;
	text: string;
	checked: boolean;
}

export interface ActiveFilterTag {
	label: string;
	name: string;
	removeUrl: string;
}

/**
 * Every LPA that is the primary or secondary LPA of at least one published case,
 * with the number of published cases it appears on. Deliberately ignores any
 * search or filter, so the counts stay the same as the user narrows the list.
 */
export async function getLpaOptions(db: S62APortalService['db'], now: Date): Promise<LpaOption[]> {
	const published: Prisma.S62aCaseWhereInput = { S62aDates: { publishDate: { lte: now } } };

	const lpas = await db.lpa.findMany({
		where: { OR: [{ S62aCases: { some: published } }, { SecondaryS62aCases: { some: published } }] },
		select: {
			id: true,
			name: true,
			_count: {
				select: {
					S62aCases: { where: published },
					SecondaryS62aCases: { where: published }
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	return lpas.map((lpa) => ({
		id: lpa.id,
		name: lpa.name,
		count: lpa._count.S62aCases + lpa._count.SecondaryS62aCases
	}));
}

/**
 * The selected LPA ids (lower-cased, de-duplicated). Ids that don't belong to a
 * published LPA are dropped, so a stale or hand-edited URL can't filter to
 * nothing with no visible reason, or send a malformed GUID to SQL Server.
 */
export function getSelectedLpaIds(query: Request['query'], options: LpaOption[]): string[] {
	const valid = new Set(options.map((option) => option.id.toLowerCase()));
	const requested = sanitiseQueryToStringArray(query?.[LPA_PARAM]).map((id) => id.toLowerCase());
	return [...new Set(requested.filter((id) => valid.has(id)))];
}

export function buildLpaFilterItems(options: LpaOption[], selectedIds: string[]): LpaFilterItem[] {
	return options.map((option) => ({
		value: option.id,
		text: `${option.name} (${option.count})`,
		checked: selectedIds.includes(option.id.toLowerCase())
	}));
}

/** One tag per selected LPA; each links to the current URL minus that LPA (and minus the page number). */
export function buildActiveFilterTags(
	options: LpaOption[],
	selectedIds: string[],
	baseUrl: string,
	query: Request['query']
): ActiveFilterTag[] {
	return options
		.filter((option) => selectedIds.includes(option.id.toLowerCase()))
		.map((option) => ({
			label: LPA_FILTER_LABEL,
			name: option.name,
			removeUrl: buildUrlWithParams(
				baseUrl,
				query,
				{ [LPA_PARAM]: selectedIds.filter((id) => id !== option.id.toLowerCase()) },
				['page']
			)
		}));
}

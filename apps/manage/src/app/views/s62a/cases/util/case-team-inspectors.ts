import type { Reference } from '@pins/crowndev-lib/util/questions.ts';

type InspectorItem = { id?: string; inspectorId?: string };

/**
 * The inspectors to offer on an appointed person/inspector entry's page:
 * everyone except those already assigned to the case in other entries.
 *
 * The entry's own inspector stays, so changing an entry still shows its
 * current choice. Without an entry (manageListItemId), nothing is left out,
 * since the same options name the inspectors on the check page and the tab.
 */
export function inspectorsToOffer(
	inspectors: readonly Reference[],
	caseTeamInspectors: readonly InspectorItem[] | undefined,
	manageListItemId: string | null | undefined
): Reference[] {
	if (!manageListItemId) {
		return [...inspectors];
	}

	const assignedElsewhere = new Set(
		(caseTeamInspectors ?? [])
			.filter((item) => item.id !== manageListItemId)
			.map((item) => item.inspectorId)
			.filter((inspectorId): inspectorId is string => Boolean(inspectorId))
	);

	return inspectors.filter((inspector) => !assignedElsewhere.has(inspector.id));
}

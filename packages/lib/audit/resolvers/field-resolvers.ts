import { formatAddress, formatDate, formatValue, formatDateTime } from '../../util/audit-formatters.ts';
import { camelCaseToSentenceCase } from '../../util/string.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.ts';
import type { EntraGroupMembers } from '../../util/entra-groups.ts';

/**
 * Generic field resolver factories.
 */

export interface ResolverContext {
	userDisplayNameMap?: Map<string, string>;
	environmentConfig?: string;
	environmentName?: Record<string, string>;
	entraGroupMembers?: EntraGroupMembers;
	/**
	 * Display names for values that aren't static reference data, looked up
	 * for the current request and keyed by field name, e.g.
	 * { preApplicationCaseId: Map { '<case id>' => 'S62A/2026/0000001' } }
	 */
	referenceNames?: Record<string, Map<string, string>>;
}

/**
 * A field resolver takes the previous case row and the new form answer
 * and returns human-readable old/new values for the audit trail.
 */
export interface FieldResolver {
	resolve(
		previousCase: Record<string, unknown>,
		newAnswer: unknown,
		context?: ResolverContext
	): { oldValue: string; newValue: string };
}

// ── Lookup map builders ──────────────────────────────────────────────────

/**
 * Creates a lookup map from id to displayName for reference data arrays.
 */
export function createDisplayNameMap(
	items: ReadonlyArray<{ readonly id: string; readonly displayName: string }>
): Map<string, string> {
	return new Map(items.map((item) => [item.id, item.displayName]));
}

/**
 * Category type with optional parent connection (matches Prisma seed data structure).
 */
export interface CategoryWithParent {
	readonly id: string;
	readonly displayName: string;
	readonly ParentCategory?: { readonly connect?: { readonly id?: string } };
}

/**
 * Creates a lookup map from category id to hierarchical display name.
 * For child categories, formats as "Parent name > Child name".
 * For parent categories, returns just the display name.
 */
export function createCategoryDisplayNameMap(categories: ReadonlyArray<CategoryWithParent>): Map<string, string> {
	// First, build a simple id → displayName map for parent lookups
	const simpleMap = new Map(categories.map((cat) => [cat.id, cat.displayName]));

	// Then build the hierarchical map
	return new Map(
		categories.map((category) => {
			const parentId = category.ParentCategory?.connect?.id;
			if (parentId) {
				const parentName = simpleMap.get(parentId) ?? '-';
				return [category.id, `${parentName} > ${category.displayName}`];
			}
			return [category.id, category.displayName];
		})
	);
}

/**
 * Creates a lookup map from id to name for LPA data.
 * Handles both dev and prod environments.
 */
export function createLpaDisplayNameMap(
	environmentConfig: string,
	environmentName: Record<string, string>
): Map<string, string> {
	let lpas;
	try {
		const env = environmentConfig;
		lpas = env === environmentName.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	} catch {
		lpas = LOCAL_PLANNING_AUTHORITIES_DEV;
	}
	return new Map(
		lpas
			.filter((lpa): lpa is typeof lpa & { id: string; name: string } => Boolean(lpa.id && lpa.name))
			.map((lpa) => [lpa.id, lpa.name])
	);
}

// ── Display names ────────────────────────────────────────────────────────

/**
 * Returns a human-readable display name for a field.
 * Uses the display name lookup created for each service and passed in as `fields`,
 * falling back to sentence case conversion.
 */
export function getFieldDisplayName(fieldName: string, fields: Record<string, string>): string {
	return fields[fieldName] ?? camelCaseToSentenceCase(fieldName);
}

// ── Resolver factories ───────────────────────────────────────────────────

/**
 * Default resolver for simple scalar fields where the form field name
 * matches the DB column name (e.g. externalReference, name, location).
 */
export function defaultResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: formatValue(previousCase[fieldName]),
				newValue: formatValue(newAnswer)
			};
		}
	};
}

/**
 * Normalises a yes/no value to 'Yes', 'No' or '-'.
 *
 * Accepts both shapes we see in practice: real booleans, and the 'yes'/'no'
 * strings used by the view model and by BOOLEAN form questions.
 */
function toYesNo(value: unknown): string {
	if (value === true) return 'Yes';
	if (value === false) return 'No';
	if (typeof value === 'string') {
		const normalised = value.trim().toLowerCase();
		if (normalised === 'yes') return 'Yes';
		if (normalised === 'no') return 'No';
	}
	return '-';
}

/**
 * Resolver for boolean fields.
 * Both old and new values may be booleans or 'yes'/'no' strings.
 */
export function booleanResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: toYesNo(previousCase[fieldName]),
				newValue: toYesNo(newAnswer)
			};
		}
	};
}

/**
 * Creates a resolver for ID fields that map to display names via a lookup table.
 * Falls back to '[Unknown value]' if no display name is found.
 */
export function createLookupResolver(
	fieldName: string,
	displayNameMapOrFactory: Map<string, string> | ((context?: ResolverContext) => Map<string, string>)
): FieldResolver {
	return {
		resolve(previousCase, newAnswer, context) {
			const oldId = previousCase[fieldName] as string | null | undefined;
			const newId = newAnswer as string | null | undefined;

			const displayNameMap =
				typeof displayNameMapOrFactory === 'function' ? displayNameMapOrFactory(context) : displayNameMapOrFactory;

			const oldValue = oldId ? (displayNameMap.get(oldId) ?? '[Unknown value]') : '-';
			const newValue = newId ? (displayNameMap.get(newId) ?? '[Unknown value]') : '-';

			return { oldValue, newValue };
		}
	};
}

/**
 * Lookup resolver for local planning authority ID fields.
 * The LPA list depends on the environment, so it is built from the context.
 */
export function lpaLookupResolver(fieldName: string): FieldResolver {
	return createLookupResolver(fieldName, (ctx) =>
		createLpaDisplayNameMap(ctx?.environmentConfig ?? '', ctx?.environmentName ?? {})
	);
}

/**
 * Formats a monetary value with '£' and 2 decimal places.
 * Accepts numbers, numeric strings (as submitted by forms) and Prisma Decimals.
 * Returns '-' for empty values.
 */
function toMoney(value: unknown): string {
	if (value === null || value === undefined || value === '') return '-';

	const amount = typeof value === 'number' ? value : Number(value);
	if (Number.isFinite(amount)) return `£${amount.toFixed(2)}`;

	// Not a number: show text as it was entered, and nothing for anything else
	return typeof value === 'string' ? value : '-';
}

/**
 * Resolver for monetary fields. Values are formatted with '£' as a prefix.
 */
export function monetaryResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: toMoney(previousCase[fieldName]),
				newValue: toMoney(newAnswer)
			};
		}
	};
}

/**
 * Address fields — the form submits an address object, the DB stores it
 * as a relation. Formats both as a comma-separated address string.
 */
export function addressResolver(previousCaseFieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			const oldAddress = previousCase[previousCaseFieldName] as Record<string, unknown> | null;
			const newAddress = newAnswer as Record<string, unknown> | null;

			return {
				oldValue: formatAddress(oldAddress),
				newValue: formatAddress(newAddress)
			};
		}
	};
}

/**
 * Formats a date-only value, returning '-' for empty values.
 */
function toDate(value: unknown): string {
	if (value === null || value === undefined || value === '') return '-';
	return formatDate(value as Date | string);
}

/**
 * Resolver for date-only fields (no time component).
 */
export function dateResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: toDate(previousCase[fieldName]),
				newValue: toDate(newAnswer)
			};
		}
	};
}

/**
 * Date period fields with a start and end date.
 */
export function dateRangeResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			const oldPeriod = previousCase[fieldName] as {
				start: Date | string | null;
				end: Date | string | null;
			} | null;
			const newPeriod = newAnswer as { start: string | null; end: string | null } | null;

			const oldDisplay = oldPeriod ? `${formatValue(oldPeriod.start)} - ${formatValue(oldPeriod.end)}` : '-';
			const newDisplay = newPeriod ? `${formatValue(newPeriod.start)} - ${formatValue(newPeriod.end)}` : '-';

			return { oldValue: oldDisplay, newValue: newDisplay };
		}
	};
}

/**
 * Date-time field resolver (e.g. site visit).
 * Uses audit date-time formatter so time is included when present.
 */
export function dateAndTimeResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			const oldValue = formatDateTime(previousCase[fieldName] as Date | string | null | undefined);
			const newValue = formatDateTime(newAnswer as Date | string | null | undefined);
			return { oldValue, newValue };
		}
	};
}

/**
 * Resolver for Entra user ID fields (inspectors, case officers, planning officers).
 * Uses a pre-built userDisplayNameMap from context.
 * Falls back to the raw ID if the user is not found, or '-' if empty.
 */
export function entraUserResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer, context) {
			const nameMap = context?.userDisplayNameMap;
			const oldId = previousCase[fieldName] as string | null | undefined;
			const newId = newAnswer as string | null | undefined;

			return {
				oldValue: oldId == null ? '-' : (nameMap?.get(oldId) ?? oldId),
				newValue: newId == null ? '-' : (nameMap?.get(newId) ?? newId)
			};
		}
	};
}

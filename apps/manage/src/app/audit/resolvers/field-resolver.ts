import { formatAddress, formatValue } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { camelCaseToSentenceCase } from '@pins/crowndev-lib/util/string.ts';
import { FIELD_DISPLAY_NAMES } from '../../views/cases/view/questions.ts';

interface ResolverContext {
	userDisplayNameMap?: Map<string, string>;
}

/**
 * Returns a human-readable display name for a field.
 * Uses the FIELD_DISPLAY_NAMES lookup, falling back to sentence case conversion.
 */
export function getFieldDisplayName(fieldName: string): string {
	return FIELD_DISPLAY_NAMES[fieldName] ?? camelCaseToSentenceCase(fieldName);
}

/**
 * A field resolver takes the previous case row and the new form answer
 * and returns human-readable old/new values for the audit trail.
 */
interface FieldResolver {
	resolve(
		previousCase: Record<string, unknown>,
		newAnswer: unknown,
		context?: ResolverContext
	): { oldValue: string; newValue: string };
}

/**
 * Default resolver for simple scalar fields where the form field name
 * matches the DB column name (e.g. externalReference, name, location).
 */
function defaultResolver(fieldName: string): FieldResolver {
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
 * Registry of field-specific resolvers.
 *
 * Add an entry here whenever a field needs special handling — e.g. the
 * form value is a composite ID, the DB column has a different name, or
 * the value needs to be looked up from a reference table.
 *
 * Fields not in this map fall through to the default resolver, which
 * simply stringifies the raw values.
 */
const FIELD_RESOLVERS: Record<string, FieldResolver> = {
	/**
	 * Site address — the form submits an address object, the DB stores it
	 * as a relation. Formats both as a comma-separated address string.
	 */
	siteAddress: {
		resolve(previousCase, newAnswer) {
			const oldAddress = previousCase.SiteAddress as Record<string, unknown> | null;
			const newAddress = newAnswer as Record<string, unknown> | null;

			return {
				oldValue: formatAddress(oldAddress),
				newValue: formatAddress(newAddress)
			};
		}
	}
};

/**
 * Resolves human-readable old and new values for a given field.
 *
 * Looks up a field-specific resolver first; falls back to the default
 * scalar resolver if none is registered.
 */
export function resolveFieldValues(
	fieldName: string,
	previousCase: Record<string, unknown>,
	newAnswer: unknown,
	context?: ResolverContext
): { oldValue: string; newValue: string } {
	const resolver = FIELD_RESOLVERS[fieldName] ?? defaultResolver(fieldName);
	return resolver.resolve(previousCase, newAnswer, context);
}

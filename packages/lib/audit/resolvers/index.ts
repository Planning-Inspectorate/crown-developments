import { defaultResolver, type FieldResolver, type ResolverContext } from './field-resolvers.ts';

export * from './field-resolvers.ts';
export * from './util/list-changes.ts';

/**
 * A data model's field resolver registry, keyed by form field name.
 *
 * Each data model owns its registry in its own app directory, e.g.
 *   - Crown: apps/manage/src/app/views/cases/audit/field-resolvers.ts
 *   - S62A:  apps/manage/src/app/views/s62a/cases/audit/field-resolvers.ts
 */
export type FieldResolverRegistry = Record<string, FieldResolver>;

/**
 * Resolves human-readable old and new values for a given field.
 *
 * Looks up a field-specific resolver in the supplied registry first;
 * falls back to the default scalar resolver if none is registered.
 */
export function resolveFieldValues(
	registry: FieldResolverRegistry,
	fieldName: string,
	previousCase: Record<string, unknown>,
	newAnswer: unknown,
	context?: ResolverContext
): { oldValue: string; newValue: string } {
	const resolver = registry[fieldName] ?? defaultResolver(fieldName);
	return resolver.resolve(previousCase, newAnswer, context);
}

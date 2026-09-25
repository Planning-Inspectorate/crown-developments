import type { FieldResolverRegistry } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { CROWN_FIELD_RESOLVERS } from '../../../cases/audit/field-resolvers.ts';

/**
 * Field resolvers for the S62A data model.
 *
 * For now this reuses the Crown registry, so this refactor doesn't change
 * how S62A fields are audited. It's replaced by an S62A-specific registry
 * in the next PR.
 */
export const S62A_FIELD_RESOLVERS: FieldResolverRegistry = {
	...CROWN_FIELD_RESOLVERS
};

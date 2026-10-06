/**
 * Small, Prisma-model-agnostic helpers for mapping save-form edits to a Prisma update input.
 *
 * Crown (`CrownDevelopmentUpdateInput`) and S62A (`S62aCaseUpdateInput`) are different Prisma
 * models, so they can't share a single "edits -> update input" orchestration function. Several
 * individual field-mapping *patterns* are identical across both though (connect/disconnect a
 * relation, map a period answer to start/end dates); these helpers give those patterns one
 * source of truth instead of being duplicated per case type.
 */

/**
 * The shape Prisma expects for an optional (nullable) relation update: connect it if an id is
 * supplied, otherwise disconnect it.
 */
export type ConnectOrDisconnect<TId extends string = string> = { connect: { id: TId } } | { disconnect: true };

/**
 * Builds the connect/disconnect payload for an optional relation field.
 *
 * @param id - the id to connect, or a falsy value to disconnect
 */
export function connectOrDisconnect<TId extends string = string>(id: TId | null | undefined): ConnectOrDisconnect<TId> {
	return id ? { connect: { id } } : { disconnect: true };
}

/**
 * Assigns the connect/disconnect payload for an optional relation field onto the update input,
 * but only when the edit actually supplied a value for that field (`present`) - otherwise the
 * field is left untouched so unrelated saves don't clear it.
 *
 * @param input - the Prisma update input to mutate
 * @param field - the relation field on the update input, e.g. 'Status'
 * @param present - whether the edits included this field at all
 * @param id - the id to connect, or a falsy value to disconnect
 */
export function assignOptionalRelation<TInput, K extends keyof TInput, TId extends string = string>(
	input: TInput,
	field: K,
	present: boolean,
	id: TId | null | undefined
): void {
	if (!present) {
		return;
	}
	input[field] = connectOrDisconnect(id) as TInput[K];
}

/**
 * Target shape for {@link assignRepresentationsPeriod}: any update input with the two
 * representations-period date fields, which are named identically across case types.
 * Typed as `unknown` (rather than `Date | null`) because Prisma's generated nullable
 * DateTime update field type also allows a string or a `NullableDateTimeFieldUpdateOperationsInput`,
 * and differs slightly between the Crown and S62A update input types.
 */
interface RepresentationsPeriodTarget {
	representationsPeriodStartDate?: unknown;
	representationsPeriodEndDate?: unknown;
}

/**
 * Maps a `{ start, end }` representations-period answer onto the update input's
 * `representationsPeriodStartDate`/`representationsPeriodEndDate` fields, in place.
 */
export function assignRepresentationsPeriod<TInput extends RepresentationsPeriodTarget>(
	input: TInput,
	period: { start?: Date | null; end?: Date | null } | null | undefined
): void {
	input.representationsPeriodStartDate = period?.start ? period.start : null;
	input.representationsPeriodEndDate = period?.end ? period.end : null;
}

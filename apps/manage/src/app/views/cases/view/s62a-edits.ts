import type { ApplyCaseTypeUpdates } from './view-model.ts';

/**
 * S62A-specific mapping of edits to a CrownDevelopment update input.
 *
 * Deliberately limited for now: the shared subset (description, expectedDateOfSubmission, Type, Lpa)
 * is applied by applySharedUpdates before this runs. As more S62A fields are confirmed to map the same
 * way as Crown we need to promote them into applySharedUpdates rather than duplicating them here.
 *
 * Mutates `updateInput` in place; returns void.
 */
export const s62aEditsToDatabaseUpdates: ApplyCaseTypeUpdates = (updateInput, edits) => {
	// PLACEHOLDER — the backing column `applicationClassificationId` and the `ApplicationClassification`
	// reference model do not exist in the schema yet. The cast below keeps
	// this compiling until that migration lands. Once the column + relation exist:
	//   1. remove the `as Record<string, unknown>` cast,
	//   2. add `applicationClassificationId` to RELATION_ID_FIELDS in view-model.ts so it becomes a
	//      proper clearable relation-id field (supporting null to disconnect),
	//   3. the `: { disconnect: true }` branch will then correctly handle clearing.
	if ('applicationClassificationId' in edits) {
		(updateInput as Record<string, unknown>).ApplicationClassification = edits.applicationClassificationId
			? { connect: { id: edits.applicationClassificationId } }
			: { disconnect: true };
	}
};

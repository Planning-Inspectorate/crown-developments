import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRE_APPLICATION_ADVICE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { getQuestions } from '../view/questions.ts';
import type { S62aCaseViewModel } from '../view/view-model.ts';
import { AUDITABLE_SCALAR_FIELDS } from './field-resolvers.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';
import { S62A_GROUPED_FIELDS } from './grouped-fields.ts';

/**
 * Guard test: keeps the S62A audit config in step with the S62A questions.
 *
 * Every editable question must either be audited, or be listed below with
 * a reason. This stops new questions (or renamed field names) silently
 * going unaudited.
 */

/**
 * Editable questions that aren't audited as scalar fields yet.
 * Remove an entry once it's audited.
 */
const NOT_YET_AUDITED: Record<string, string> = {};

/**
 * Answer keys that are saved by a custom component alongside its question,
 * so they don't appear as a question fieldName in their own right.
 */
const COMPANION_ANSWER_KEYS = new Set([
	/** CIL amount component (question fieldName: cilLiable) */
	'cilAmount',
	/** Fee amount components (question fieldNames: hasPreApplicationFee, hasApplicationFee, eligibleForFeeRefund) */
	'preApplicationFee',
	'applicationFee',
	'applicationFeeRefundAmount'
]);

/**
 * Collects the fieldName of every editable S62A question.
 *
 * Some questions change shape depending on the answers (e.g. pre-application
 * reference is a select when advice is from PINS), so this builds the
 * questions for each variant and combines them.
 */
function getEditableFieldNames(): Set<string> {
	// Any group getQuestions asks for comes back as an empty list
	const groupMembers = new Proxy({}, { get: () => [] }) as unknown as EntraGroupMembers;

	const answerVariants = [{}, { preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS }] as S62aCaseViewModel[];

	const fieldNames = new Set<string>();

	for (const answers of answerVariants) {
		const questions = getQuestions(answers, { groupMembers }) as Record<
			string,
			{ fieldName?: string; editable?: boolean }
		>;

		for (const question of Object.values(questions)) {
			if (question?.fieldName && question.editable !== false) {
				fieldNames.add(question.fieldName);
			}
		}
	}

	return fieldNames;
}

/**
 * Every fieldName that's audited: scalar fields, grouped (multi-field input)
 * questions, manage lists, and the questions asked inside each list item.
 */
function getAuditedFieldNames(): Set<string> {
	return new Set([
		...AUDITABLE_SCALAR_FIELDS,
		...Object.keys(S62A_GROUPED_FIELDS),
		...Object.keys(S62A_LIST_RESOLVERS),
		...Object.values(S62A_LIST_RESOLVERS).flatMap((listResolver) => listResolver.subQuestions)
	]);
}

describe('S62A audit coverage', () => {
	const editableFieldNames = getEditableFieldNames();
	const auditedFieldNames = getAuditedFieldNames();

	it('should audit every editable question, or list it as not yet audited', () => {
		const missing = [...editableFieldNames].filter(
			(fieldName) => !auditedFieldNames.has(fieldName) && !(fieldName in NOT_YET_AUDITED)
		);

		assert.deepStrictEqual(
			missing,
			[],
			`These editable questions aren't audited. Add them to the S62A audit config, or to NOT_YET_AUDITED with a reason: ${missing.join(', ')}`
		);
	});

	it('should only audit fields that exist as editable questions', () => {
		const unknown = [...auditedFieldNames].filter(
			(fieldName) => !editableFieldNames.has(fieldName) && !COMPANION_ANSWER_KEYS.has(fieldName)
		);

		assert.deepStrictEqual(
			unknown,
			[],
			`These audited fields don't match any editable S62A question. Check the fieldName: ${unknown.join(', ')}`
		);
	});

	it('should not list questions as not yet audited once they are audited', () => {
		const alreadyAudited = Object.keys(NOT_YET_AUDITED).filter((fieldName) => auditedFieldNames.has(fieldName));

		assert.deepStrictEqual(alreadyAudited, [], `Remove these from NOT_YET_AUDITED: ${alreadyAudited.join(', ')}`);
	});

	it('should not list questions that no longer exist as not yet audited', () => {
		const stale = Object.keys(NOT_YET_AUDITED).filter((fieldName) => !editableFieldNames.has(fieldName));

		assert.deepStrictEqual(
			stale,
			[],
			`These NOT_YET_AUDITED entries don't match any editable question: ${stale.join(', ')}`
		);
	});
});

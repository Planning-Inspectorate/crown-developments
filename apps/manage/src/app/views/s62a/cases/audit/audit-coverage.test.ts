import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRE_APPLICATION_ADVICE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { getQuestions } from '../view/questions.ts';
import type { S62aCaseViewModel } from '../view/view-model.ts';
import { AUDITABLE_SCALAR_FIELDS, S62A_AUDIT_FIELD_LABELS, S62A_DERIVED_FIELDS } from './field-resolvers.ts';
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
 * Fields the save works out from other answers (e.g. the target dates from
 * the valid date), so they're audited without being questions themselves.
 */
const DERIVED_FIELDS = new Set<string>(S62A_DERIVED_FIELDS);

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

	it('should audit every editable question', () => {
		const missing = [...editableFieldNames].filter((fieldName) => !auditedFieldNames.has(fieldName));

		assert.deepStrictEqual(
			missing,
			[],
			`These editable questions aren't audited. Add them to the S62A audit config: ${missing.join(', ')}`
		);
	});

	it('should only audit fields that exist as editable questions', () => {
		const unknown = [...auditedFieldNames].filter(
			(fieldName) =>
				!editableFieldNames.has(fieldName) && !COMPANION_ANSWER_KEYS.has(fieldName) && !DERIVED_FIELDS.has(fieldName)
		);

		assert.deepStrictEqual(
			unknown,
			[],
			`These audited fields don't match any editable S62A question. Check the fieldName: ${unknown.join(', ')}`
		);
	});

	it('should audit every derived field, with a label', () => {
		// Derived fields have no question, so there's no question title to fall back on
		const missing = S62A_DERIVED_FIELDS.filter(
			(fieldName) => !auditedFieldNames.has(fieldName) || !Object.hasOwn(S62A_AUDIT_FIELD_LABELS, fieldName)
		);

		assert.deepStrictEqual(
			missing,
			[],
			`These derived fields need adding to the S62A date fields and labels: ${missing.join(', ')}`
		);
	});
});

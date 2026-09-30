import {
	CONTACT_PREFERENCE,
	RECEIVED_METHOD,
	REPRESENTATION_CATEGORY,
	REPRESENTATION_SUBMITTED_FOR,
	REPRESENTED_TYPE,
	WITHDRAWAL_REASON
} from '@pins/crowndev-database/src/seed/data-static.ts';
import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { resolveAuditAction } from '@pins/crowndev-lib/audit/actions.ts';
import {
	addressResolver,
	booleanResolver,
	dateResolver,
	getFieldDisplayName,
	joinParts,
	lookupResolver,
	resolveFieldValues,
	resolveGroupedFieldChanges,
	toListItems,
	toText,
	type FieldResolver,
	type FieldResolverRegistry,
	type GroupedFieldRegistry
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';

/**
 * Audit configuration for S62A representation edits made after review.
 *
 * Keys are the representation view model / answer field names, as used by
 * the representation questions and `s62aEditsToDatabaseUpdates`. Fields for
 * the person submitting come in 'myself' and 'submitter' versions, depending
 * on who the representation was submitted for.
 */

// ── Formatting helpers ───────────────────────────────────────────────────

/** Joins a first and last name, or returns undefined if neither is set. */
function fullName(firstName: unknown, lastName: unknown): string | undefined {
	return [toText(firstName), toText(lastName)].filter(Boolean).join(' ') || undefined;
}

/** The members of a group, as a comma-separated list of names. */
function formatGroupMembers(value: unknown): string {
	return joinParts(
		toListItems(value).map((member) => fullName(member.groupRepresentedFirstName, member.groupRepresentedLastName))
	);
}

const groupMembersResolver: FieldResolver = {
	resolve(previous, newAnswer) {
		return {
			oldValue: formatGroupMembers(previous.manageGroupDetails),
			newValue: formatGroupMembers(newAnswer)
		};
	}
};

// ── Fields ───────────────────────────────────────────────────────────────

/** Short text fields. The default resolver shows the raw value. */
const TEXT_FIELDS = [
	'myselfEmail',
	'submitterEmail',
	'submissionMethodReason',
	'orgName',
	'orgRoleName',
	'agentOrgName',
	'representedOrgName',
	'groupName'
] as const;

/**
 * The representation comment. It can be long, so it's recorded with the
 * long field actions, which show the old and new text in an expandable view.
 */
const LONG_TEXT_FIELDS = ['myselfComment', 'submitterComment'] as const;

/** Resolvers for fields that need more than the raw value. */
export const REPRESENTATION_FIELD_RESOLVERS: FieldResolverRegistry = {
	// Reference data
	categoryId: lookupResolver('categoryId', REPRESENTATION_CATEGORY),
	submittedForId: lookupResolver('submittedForId', REPRESENTATION_SUBMITTED_FOR),
	submittedReceivedMethodId: lookupResolver('submittedReceivedMethodId', RECEIVED_METHOD),
	representedTypeId: lookupResolver('representedTypeId', REPRESENTED_TYPE),
	myselfContactPreference: lookupResolver('myselfContactPreference', CONTACT_PREFERENCE),
	submitterContactPreference: lookupResolver('submitterContactPreference', CONTACT_PREFERENCE),
	withdrawalReasonId: lookupResolver('withdrawalReasonId', WITHDRAWAL_REASON),

	// Dates
	submittedDate: dateResolver('submittedDate'),
	withdrawalRequestDate: dateResolver('withdrawalRequestDate'),
	dateWithdrawn: dateResolver('dateWithdrawn'),

	// Addresses
	myselfAddress: addressResolver('myselfAddress'),
	submitterAddress: addressResolver('submitterAddress'),

	// Yes/no
	containsAttachments: booleanResolver('containsAttachments'),
	myselfHearingPreference: booleanResolver('myselfHearingPreference'),
	submitterHearingPreference: booleanResolver('submitterHearingPreference'),
	myselfContainsAttachments: booleanResolver('myselfContainsAttachments'),
	submitterContainsAttachments: booleanResolver('submitterContainsAttachments'),
	myselfWithholdName: booleanResolver('myselfWithholdName'),
	submitterWithholdName: booleanResolver('submitterWithholdName'),
	isAgent: booleanResolver('isAgent'),
	distressingContentInRepresentation: booleanResolver('distressingContentInRepresentation'),

	// The people in a group representation
	manageGroupDetails: groupMembersResolver
};

/** Every single-answer field that's audited. */
export const REPRESENTATION_AUDIT_FIELDS: ReadonlySet<string> = new Set([
	...TEXT_FIELDS,
	...LONG_TEXT_FIELDS,
	...Object.keys(REPRESENTATION_FIELD_RESOLVERS)
]);

const REPRESENTATION_LONG_FIELDS: ReadonlySet<string> = new Set(LONG_TEXT_FIELDS);

/**
 * Names entered as a first and last name, recorded as one 'name' change.
 * Keyed by the name question's own fieldName.
 */
export const REPRESENTATION_GROUPED_FIELDS: GroupedFieldRegistry = {
	myselfFullName: {
		parts: ['myselfFirstName', 'myselfLastName'],
		format: (values) => fullName(values.myselfFirstName, values.myselfLastName) ?? '-'
	},
	submitterFullName: {
		parts: ['submitterFirstName', 'submitterLastName'],
		format: (values) => fullName(values.submitterFirstName, values.submitterLastName) ?? '-'
	},
	representedFullName: {
		parts: ['representedFirstName', 'representedLastName'],
		format: (values) => fullName(values.representedFirstName, values.representedLastName) ?? '-'
	}
};

/**
 * Labels that take priority over the question titles. The rest come from
 * the questions, falling back to the field name in sentence case.
 */
export const REPRESENTATION_AUDIT_FIELD_LABELS: Readonly<Record<string, string>> = {
	// Named on the scenarios sheet
	categoryId: 'Representation type',

	// The person the representation is from (myself), or who submitted it for
	// someone else (submitter). Both share the same question titles.
	myselfFullName: 'Name',
	submitterFullName: 'Submitter name',
	myselfComment: 'Comment',
	submitterComment: 'Comment',
	myselfContactPreference: 'Contact preference',
	submitterContactPreference: 'Contact preference',
	myselfAddress: 'Address',
	submitterAddress: 'Address',
	myselfHearingPreference: 'Wants to be heard at a hearing',
	submitterHearingPreference: 'Wants to be heard at a hearing',
	myselfContainsAttachments: 'Has attachments',
	submitterContainsAttachments: 'Has attachments',
	myselfWithholdName: 'Name withheld',
	submitterWithholdName: 'Name withheld',

	// Question titles written for the public portal, reworded to describe the
	// representation (based on the questions' manage wording)
	submittedForId: 'Source of the representation',
	representedTypeId: 'Representation made on behalf of',
	orgName: 'Organisation or charity name',
	orgRoleName: 'Job title or role',
	representedOrgName: 'Organisation or charity being represented',
	isAgent: 'Submitted by an agent',
	groupName: 'Group name',

	// Question titles phrased as questions
	submittedDate: 'Date received',
	submittedReceivedMethodId: 'How the representation was received',
	withdrawalReasonId: 'Withdrawal reason',
	containsAttachments: 'Has attachments'
};

// ── Building the entries ─────────────────────────────────────────────────

export interface RepresentationUpdateAuditArgs {
	caseId: string;
	userId: string;
	representationReference: string;
	/** The answers that were saved */
	answers: Record<string, unknown>;
	/** The representation as it was before the save (the view model) */
	previous: Record<string, unknown>;
	/** Question titles by field name, used where there's no audit label */
	questionLabels?: Record<string, string>;
}

/**
 * Works out the case history entries for a representation edited after
 * review: one entry per changed field, e.g.
 *   'Representation type (353RK-4766) was updated from "Consultees" to "Interested party"'
 *
 * The comment uses the long field actions, so it reads
 * 'Comment (353RK-4766) was updated' with the old and new text expandable.
 * Unchanged fields, and fields that aren't audited (e.g. attachments), record nothing.
 */
export function resolveRepresentationUpdateAudits({
	caseId,
	userId,
	representationReference,
	answers,
	previous,
	questionLabels = {}
}: RepresentationUpdateAuditArgs): AuditEntry[] {
	const labels = { ...questionLabels, ...REPRESENTATION_AUDIT_FIELD_LABELS };
	const updatedFieldNames = Object.keys(answers);
	const entries: AuditEntry[] = [];

	const addUpdate = (fieldName: string, oldValue: string, newValue: string) => {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.REPRESENTATION_UPDATED,
			metadata: {
				fieldName: getFieldDisplayName(fieldName, labels),
				reference: representationReference,
				oldValue,
				newValue
			}
		});
	};

	for (const fieldName of updatedFieldNames) {
		if (!REPRESENTATION_AUDIT_FIELDS.has(fieldName)) {
			continue;
		}

		const { oldValue, newValue } = resolveFieldValues(
			REPRESENTATION_FIELD_RESOLVERS,
			fieldName,
			previous,
			answers[fieldName]
		);

		if (oldValue === newValue) {
			continue;
		}

		if (REPRESENTATION_LONG_FIELDS.has(fieldName)) {
			entries.push({
				caseId,
				userId,
				action: resolveAuditAction(oldValue, newValue, true),
				metadata: {
					fieldName: `${getFieldDisplayName(fieldName, labels)} (${representationReference})`,
					oldValue,
					newValue
				}
			});
			continue;
		}

		addUpdate(fieldName, oldValue, newValue);
	}

	for (const { fieldName, oldValue, newValue } of resolveGroupedFieldChanges(
		REPRESENTATION_GROUPED_FIELDS,
		updatedFieldNames,
		previous,
		answers
	)) {
		addUpdate(fieldName, oldValue, newValue);
	}

	return entries;
}

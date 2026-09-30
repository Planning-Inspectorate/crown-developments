import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate } from '@pins/crowndev-lib/audit/shared-actions.ts';
import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import {
	REPRESENTATION_CATEGORY_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { S62A_AUDIT_ACTIONS, S62A_AUDIT_TEMPLATES, type S62aAuditAction } from './actions.ts';
import {
	REPRESENTATION_AUDIT_FIELDS,
	REPRESENTATION_FIELD_RESOLVERS,
	resolveRepresentationUpdateAudits
} from './representation-fields.ts';

const REFERENCE = '353RK-4766';

function resolve(
	previous: Record<string, unknown>,
	answers: Record<string, unknown>,
	questionLabels?: Record<string, string>
) {
	return resolveRepresentationUpdateAudits({
		caseId: 'case-1',
		userId: 'user-1',
		representationReference: REFERENCE,
		previous,
		answers,
		questionLabels
	});
}

/** The entry's text as the case history would show it */
function details(entry: AuditEntry): string {
	return fillTemplate(
		S62A_AUDIT_TEMPLATES[entry.action as S62aAuditAction],
		(entry.metadata ?? undefined) as Record<string, unknown> | undefined
	);
}

describe('resolveRepresentationUpdateAudits', () => {
	it('should match the scenarios sheet for the representation type', () => {
		const [entry] = resolve(
			{ categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES },
			{ categoryId: REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES }
		);

		assert.strictEqual(entry.action, S62A_AUDIT_ACTIONS.REPRESENTATION_UPDATED);
		assert.strictEqual(
			details(entry),
			`Representation type (${REFERENCE}) was updated from "Consultees" to "Interested party"`
		);
	});

	it('should record nothing for unchanged fields', () => {
		assert.deepStrictEqual(resolve({ myselfEmail: 'one@example.com' }, { myselfEmail: 'one@example.com' }), []);
	});

	it('should record nothing for fields that are not audited', () => {
		assert.deepStrictEqual(
			resolve(
				{ statusId: 'accepted' },
				{ statusId: 'rejected', myselfBlobAttachments: [{ fileName: 'doc.pdf', itemId: 'doc-1' }] }
			),
			[]
		);
	});

	it('should record one entry for each changed field', () => {
		const entries = resolve(
			{ myselfEmail: 'one@example.com', isAgent: 'no' },
			{ myselfEmail: 'two@example.com', isAgent: 'yes' }
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[
				{ fieldName: 'Myself email', reference: REFERENCE, oldValue: 'one@example.com', newValue: 'two@example.com' },
				{ fieldName: 'Submitted by an agent', reference: REFERENCE, oldValue: 'No', newValue: 'Yes' }
			]
		);
	});

	it('should show reference data by its display name', () => {
		const [entry] = resolve(
			{ submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF },
			{ submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF }
		);

		assert.deepStrictEqual(entry.metadata, {
			fieldName: 'Source of the representation',
			reference: REFERENCE,
			oldValue: 'Myself',
			newValue: 'On behalf of another person or an organisation'
		});
	});

	it('should record a first or last name change as one name change', () => {
		const entries = resolve({ myselfFirstName: 'Test', myselfLastName: 'User One' }, { myselfLastName: 'User Two' });

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[{ fieldName: 'Name', reference: REFERENCE, oldValue: 'Test User One', newValue: 'Test User Two' }]
		);
	});

	it('should use the question title for the represented person name', () => {
		const [entry] = resolve(
			{ representedFirstName: 'Test', representedLastName: 'User One' },
			{ representedFirstName: 'Other' },
			{ representedFullName: 'Represented person name' }
		);

		assert.strictEqual(entry.metadata?.fieldName, 'Represented person name');
	});

	it('should record the comment with the long field actions', () => {
		const [entry] = resolve({ myselfComment: 'Old comment' }, { myselfComment: 'New comment' });

		assert.strictEqual(entry.action, S62A_AUDIT_ACTIONS.LONG_FIELD_UPDATED);
		assert.deepStrictEqual(entry.metadata, {
			fieldName: `Comment (${REFERENCE})`,
			oldValue: 'Old comment',
			newValue: 'New comment'
		});
		assert.strictEqual(details(entry), `Comment (${REFERENCE}) was updated`);
	});

	it('should list the members of a group', () => {
		const [entry] = resolve(
			{
				manageGroupDetails: [{ id: 'p1', groupRepresentedFirstName: 'Test', groupRepresentedLastName: 'User One' }]
			},
			{
				manageGroupDetails: [
					{ id: 'p1', groupRepresentedFirstName: 'Test', groupRepresentedLastName: 'User One' },
					{ groupRepresentedFirstName: 'Test', groupRepresentedLastName: 'User Two' }
				]
			}
		);

		assert.strictEqual(entry.metadata?.oldValue, 'Test User One');
		assert.strictEqual(entry.metadata?.newValue, 'Test User One, Test User Two');
	});

	describe('labels', () => {
		it('should use the question title when there is no audit label', () => {
			const [entry] = resolve(
				{ submitterEmail: 'one@example.com' },
				{ submitterEmail: 'two@example.com' },
				{ submitterEmail: 'Email address' }
			);

			assert.strictEqual(entry.metadata?.fieldName, 'Email address');
		});

		it('should prefer the audit label over the question title', () => {
			const [entry] = resolve(
				{ orgName: 'Test Organisation' },
				{ orgName: 'Test Organisation Ltd' },
				{ orgName: 'Your organisation or charity name' }
			);

			assert.strictEqual(entry.metadata?.fieldName, 'Organisation or charity name');
		});
	});
});

describe('REPRESENTATION_AUDIT_FIELDS', () => {
	it('should audit every field that has a resolver', () => {
		for (const fieldName of Object.keys(REPRESENTATION_FIELD_RESOLVERS)) {
			assert.ok(REPRESENTATION_AUDIT_FIELDS.has(fieldName), `${fieldName} has a resolver but is not audited`);
		}
	});
});

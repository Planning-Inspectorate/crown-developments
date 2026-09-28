import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCaseUpdateAudits, type CaseUpdateAuditConfig } from './case-update.ts';
import { booleanResolver } from './field-resolvers.ts';
import { joinParts, toNumberText } from './util/values.ts';
import { SHARED_AUDIT_ACTIONS } from '../shared-actions.ts';
import { resolveListAudits, type ListResolverRegistry } from './util/list-changes.ts';

const config: CaseUpdateAuditConfig = {
	fieldResolvers: { hasAgent: booleanResolver('hasAgent') },
	auditableFields: new Set(['lpaReference', 'hasAgent', 'description']),
	longFields: new Set(['description']),
	groupedFields: {
		siteCoordinates: {
			parts: ['siteEasting', 'siteNorthing'],
			format: (values) => joinParts([toNumberText(values.siteEasting), toNumberText(values.siteNorthing)])
		}
	},
	labels: { hasAgent: 'Has agent' }
};

function resolve(
	previousCase: Record<string, unknown>,
	answers: Record<string, unknown>,
	questionLabels?: Record<string, string>
) {
	return resolveCaseUpdateAudits({
		caseId: 'case-1',
		userId: 'user-1',
		updatedFieldNames: Object.keys(answers),
		previousCase,
		answers,
		config,
		questionLabels
	});
}

describe('resolveCaseUpdateAudits', () => {
	it('should record a changed field', () => {
		const questionLabels = { lpaReference: 'LPA reference' };

		assert.deepStrictEqual(resolve({ lpaReference: 'ABC/123' }, { lpaReference: 'DEF/345' }, questionLabels), [
			{
				caseId: 'case-1',
				userId: 'user-1',
				action: SHARED_AUDIT_ACTIONS.FIELD_UPDATED,
				metadata: { fieldName: 'LPA reference', oldValue: 'ABC/123', newValue: 'DEF/345' }
			}
		]);
	});

	it('should pick set, updated or removed', () => {
		const [set] = resolve({}, { lpaReference: 'ABC/123' });
		const [removed] = resolve({ lpaReference: 'ABC/123' }, { lpaReference: null });

		assert.strictEqual(set.action, SHARED_AUDIT_ACTIONS.FIELD_SET);
		assert.strictEqual(removed.action, SHARED_AUDIT_ACTIONS.FIELD_CLEARED);
	});

	it('should use the registered resolver for a field', () => {
		const [entry] = resolve({ hasAgent: 'no' }, { hasAgent: 'yes' });

		assert.deepStrictEqual(entry.metadata, { fieldName: 'Has agent', oldValue: 'No', newValue: 'Yes' });
	});

	it('should use the long field actions for long fields', () => {
		const [entry] = resolve({ description: 'Old' }, { description: 'New' });

		assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.LONG_FIELD_UPDATED);
	});

	it('should record nothing for unchanged fields, or fields that are not audited', () => {
		assert.deepStrictEqual(resolve({ lpaReference: 'ABC/123' }, { lpaReference: 'ABC/123' }), []);
		assert.deepStrictEqual(resolve({}, { notAudited: 'value' }), []);
	});

	it('should record one entry for a multi-field question, not one per input', () => {
		const entries = resolve({ siteEasting: 1, siteNorthing: 2 }, { siteEasting: '3', siteNorthing: '4' });

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[{ fieldName: 'Site coordinates', oldValue: '1, 2', newValue: '3, 4' }]
		);
	});

	describe('labels', () => {
		it('should use the question title when there is no audit label', () => {
			const [entry] = resolve(
				{ lpaReference: 'ABC/123' },
				{ lpaReference: 'DEF/345' },
				{ lpaReference: 'LPA reference' }
			);

			assert.strictEqual(entry.metadata?.fieldName, 'LPA reference');
		});

		it('should prefer the audit label over the question title', () => {
			const [entry] = resolve({ hasAgent: 'no' }, { hasAgent: 'yes' }, { hasAgent: 'Has' });

			assert.strictEqual(entry.metadata?.fieldName, 'Has agent');
		});
	});

	describe('manage lists', () => {
		const listResolvers: ListResolverRegistry = {
			manageThings: {
				subQuestions: [],
				resolve: ({ caseId, userId, oldItems, newItems }) =>
					resolveListAudits(caseId, userId, oldItems, newItems, {
						actions: {
							added: SHARED_AUDIT_ACTIONS.FIELD_SET,
							updated: SHARED_AUDIT_ACTIONS.FIELD_UPDATED,
							deleted: SHARED_AUDIT_ACTIONS.FIELD_CLEARED
						},
						getName: (item) => String(item.name),
						fields: []
					})
			}
		};

		function resolveList(previousCase: Record<string, unknown>, answers: Record<string, unknown>) {
			return resolveCaseUpdateAudits({
				caseId: 'case-1',
				userId: 'user-1',
				updatedFieldNames: Object.keys(answers),
				previousCase,
				answers,
				config: { ...config, listResolvers }
			});
		}

		it('should record the changes to a list in the save', () => {
			const entries = resolveList(
				{ manageThings: [{ id: 'a', name: 'First' }] },
				{
					manageThings: [
						{ id: 'a', name: 'First' },
						{ id: 'b', name: 'Second' }
					]
				}
			);

			assert.deepStrictEqual(entries, [
				{ caseId: 'case-1', userId: 'user-1', action: SHARED_AUDIT_ACTIONS.FIELD_SET, metadata: { name: 'Second' } }
			]);
		});

		it('should not run a list resolver for lists that are not in the save', () => {
			assert.deepStrictEqual(
				resolveList({ manageThings: [{ id: 'a', name: 'First' }] }, { lpaReference: 'ABC/123' }).length,
				1
			);
		});

		it('should record list entries after the field entries', () => {
			const entries = resolveList(
				{ lpaReference: 'ABC/123', manageThings: [] },
				{ lpaReference: 'DEF/345', manageThings: [{ id: 'a', name: 'First' }] }
			);

			assert.deepStrictEqual(
				entries.map((entry) => entry.action),
				[SHARED_AUDIT_ACTIONS.FIELD_UPDATED, SHARED_AUDIT_ACTIONS.FIELD_SET]
			);
		});
	});
});

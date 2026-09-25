import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFieldValues, type ResolverContext } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { APPLICATION_PROCEDURE, APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPES,
	DECISION_OUTCOMES,
	INSPECTOR_BANDS,
	MAJOR_OR_NON_MAJORS,
	OUTCOME_TYPES,
	PRE_APPLICATION_ADVICE,
	S62A_APPLICATION_STATUSES,
	S62A_CATEGORIES,
	S62A_PRE_APPLICATION_STATUSES,
	S62A_STAGES,
	SITE_VISIT_TYPES,
	SPECIALISMS
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	AUDITABLE_SCALAR_FIELDS,
	LONG_AUDIT_FIELDS,
	S62A_AUDIT_FIELD_LABELS,
	S62A_FIELD_RESOLVERS
} from './field-resolvers.ts';

/**
 * Resolves field values using the S62A registry, so each test only
 * needs to pass the field name and values.
 */
function resolve(
	fieldName: string,
	previousCase: Record<string, unknown>,
	newAnswer: unknown,
	context?: ResolverContext
) {
	return resolveFieldValues(S62A_FIELD_RESOLVERS, fieldName, previousCase, newAnswer, context);
}

describe('S62A field resolvers', () => {
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	describe('reference data lookups', () => {
		// Uses the first two entries of each list, so the tests don't depend on specific seed IDs
		const lookups: [string, ReadonlyArray<{ id: string; displayName: string }>][] = [
			['typeId', APPLICATION_TYPES],
			['classificationId', MAJOR_OR_NON_MAJORS],
			['specialismId', SPECIALISMS],
			['inspectorBandId', INSPECTOR_BANDS],
			['s62aStatusId', S62A_APPLICATION_STATUSES],
			['stageId', S62A_STAGES],
			['categoryId', S62A_CATEGORIES],
			['procedureId', APPLICATION_PROCEDURE],
			['applicantType', APPLICANT_TYPES],
			['preApplicationAdviceId', PRE_APPLICATION_ADVICE],
			['outcomeTypeId', OUTCOME_TYPES],
			['decisionOutcomeId', DECISION_OUTCOMES],
			['siteVisitTypeId', SITE_VISIT_TYPES]
		];

		for (const [fieldName, items] of lookups) {
			it(`should resolve ${fieldName} to display names`, () => {
				const [first, second] = items;

				const { oldValue, newValue } = resolve(fieldName, { [fieldName]: first.id }, second.id);

				assert.strictEqual(oldValue, first.displayName);
				assert.strictEqual(newValue, second.displayName);
			});
		}

		it('should resolve pre-application statuses as well as application statuses', () => {
			const [preAppStatus] = S62A_PRE_APPLICATION_STATUSES;

			const { newValue } = resolve('s62aStatusId', {}, preAppStatus.id);

			assert.strictEqual(newValue, preAppStatus.displayName);
		});

		it('should return "-" when a lookup is set for the first time', () => {
			const [stage] = S62A_STAGES;

			const { oldValue, newValue } = resolve('stageId', { stageId: null }, stage.id);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, stage.displayName);
		});
	});

	describe('entra user fields', () => {
		const userDisplayNameMap = new Map([
			['user-1', 'Test User One'],
			['user-2', 'Test User Two']
		]);

		for (const fieldName of ['caseOfficerId', 'assessorInspectorId', 'planningOfficerId', 'readerId']) {
			it(`should resolve ${fieldName} to user display names`, () => {
				const { oldValue, newValue } = resolve(fieldName, { [fieldName]: 'user-1' }, 'user-2', {
					userDisplayNameMap
				});

				assert.strictEqual(oldValue, 'Test User One');
				assert.strictEqual(newValue, 'Test User Two');
			});
		}
	});

	describe('boolean fields', () => {
		it('should handle yes/no strings from the form', () => {
			const { oldValue, newValue } = resolve(
				'isWasteManagementDevelopment',
				{ isWasteManagementDevelopment: 'yes' },
				'no'
			);

			assert.strictEqual(oldValue, 'Yes');
			assert.strictEqual(newValue, 'No');
		});
	});

	describe('monetary fields', () => {
		for (const fieldName of [
			'cilAmount',
			'preApplicationFee',
			'applicationFee',
			'applicationFeeRefundAmount',
			'pressNoticeCost'
		]) {
			it(`should format ${fieldName} as money`, () => {
				const { oldValue, newValue } = resolve(fieldName, { [fieldName]: 1000 }, '2000.5');

				assert.strictEqual(oldValue, '£1000.00');
				assert.strictEqual(newValue, '£2000.50');
			});
		}
	});

	describe('date fields', () => {
		it('should format date-only fields', () => {
			const { oldValue, newValue } = resolve(
				'applicationValidDate',
				{ applicationValidDate: new Date('2026-01-01T00:00:00Z') },
				new Date('2026-02-15T00:00:00Z')
			);

			assert.strictEqual(oldValue, '1 January 2026');
			assert.strictEqual(newValue, '15 February 2026');
		});

		it('should format reconsultation details as a date period', () => {
			const { oldValue, newValue } = resolve(
				'reconsultationDetailsDate',
				{ reconsultationDetailsDate: null },
				{ start: new Date('2026-01-01T00:00:00Z'), end: new Date('2026-01-15T00:00:00Z') }
			);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, '1 January 2026 - 15 January 2026');
		});
	});

	describe('address fields', () => {
		it('should format agentAddress', () => {
			const { oldValue, newValue } = resolve(
				'agentAddress',
				{ agentAddress: null },
				{ addressLine1: '1 Test Street', townCity: 'Test Town', postcode: 'TE1 1ST' }
			);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, '1 Test Street, Test Town, TE1 1ST');
		});
	});

	describe('text fields', () => {
		it('should use the default resolver for hearing venue', () => {
			const { oldValue, newValue } = resolve('venue', { venue: 'Old venue' }, 'New venue');

			assert.strictEqual(oldValue, 'Old venue');
			assert.strictEqual(newValue, 'New venue');
		});
	});

	describe('pre-application case', () => {
		const references = new Map([
			['case-a', 'S62A/2026/0000001'],
			['case-b', 'S62A/2026/0000002']
		]);
		const context = { referenceNames: { preApplicationCaseId: references } };

		it('should show a newly linked case by its reference', () => {
			const { oldValue, newValue } = resolve('preApplicationCaseId', {}, 'case-a', context);

			assert.strictEqual(oldValue, '-');
			assert.strictEqual(newValue, 'S62A/2026/0000001');
		});

		it('should use the view model reference for the previously linked case', () => {
			const { oldValue, newValue } = resolve(
				'preApplicationCaseId',
				{ preApplicationCaseId: 'case-a', preApplicationReference: 'S62A/2026/0000001' },
				'case-b',
				context
			);

			assert.strictEqual(oldValue, 'S62A/2026/0000001');
			assert.strictEqual(newValue, 'S62A/2026/0000002');
		});

		it('should show "-" when the link is removed', () => {
			const { oldValue, newValue } = resolve(
				'preApplicationCaseId',
				{ preApplicationCaseId: 'case-a', preApplicationReference: 'S62A/2026/0000001' },
				null,
				context
			);

			assert.strictEqual(oldValue, 'S62A/2026/0000001');
			assert.strictEqual(newValue, '-');
		});

		it('should see an unchanged link as unchanged, even without a lookup', () => {
			const { oldValue, newValue } = resolve(
				'preApplicationCaseId',
				{ preApplicationCaseId: 'case-a', preApplicationReference: 'S62A/2026/0000001' },
				'case-a'
			);

			assert.strictEqual(oldValue, newValue);
		});

		it('should fall back to the ID if the reference could not be looked up', () => {
			const { newValue } = resolve('preApplicationCaseId', {}, 'case-unknown');

			assert.strictEqual(newValue, 'case-unknown');
		});
	});

	describe('auditable field sets', () => {
		it('should audit every field in the registry', () => {
			for (const fieldName of Object.keys(S62A_FIELD_RESOLVERS)) {
				assert.ok(AUDITABLE_SCALAR_FIELDS.has(fieldName), `${fieldName} is in the registry but not auditable`);
			}
		});

		it('should only mark auditable fields as long fields', () => {
			for (const fieldName of LONG_AUDIT_FIELDS) {
				assert.ok(AUDITABLE_SCALAR_FIELDS.has(fieldName), `${fieldName} is a long field but not auditable`);
			}
		});

		it('should only have audit labels for audited fields', () => {
			for (const fieldName of Object.keys(S62A_AUDIT_FIELD_LABELS)) {
				assert.ok(AUDITABLE_SCALAR_FIELDS.has(fieldName), `${fieldName} has an audit label but is not audited`);
			}
		});

		it('should label CIL liable and CIL amount separately', () => {
			assert.strictEqual(S62A_AUDIT_FIELD_LABELS.cilLiable, 'CIL liable');
			assert.strictEqual(S62A_AUDIT_FIELD_LABELS.cilAmount, 'CIL amount');
		});

		it('should not include fields copied over from Crown that S62A does not have', () => {
			for (const fieldName of [
				'description',
				'statusId',
				'subCategoryId',
				'agentOrganisationName',
				'hearingVenue',
				'inquiryVenue'
			]) {
				assert.ok(!AUDITABLE_SCALAR_FIELDS.has(fieldName), `${fieldName} should not be audited for S62A`);
			}
		});
	});
});

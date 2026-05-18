import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DOCUMENT_CATEGORIES, CATEGORY_SHAREPOINT_TO_VALUE, CATEGORY_VALUE_TO_SHAREPOINT } from './categories.ts';

// Helper to get category values
function getCategoryValues() {
	return DOCUMENT_CATEGORIES.map((cat) => cat.value);
}

function getCategorySharePointNames() {
	return DOCUMENT_CATEGORIES.map((cat) => cat.sharepointName);
}

function getCategoryDisplayNames() {
	return DOCUMENT_CATEGORIES.map((cat) => cat.displayName);
}

describe('Document Categories', () => {
	describe('DOCUMENT_CATEGORIES', () => {
		it('should contain all expected categories', () => {
			assert.strictEqual(DOCUMENT_CATEGORIES.length, 6);

			assert.deepStrictEqual(getCategoryValues(), [
				'application',
				'lpaQuestionnaire',
				'writtenRepresentations',
				'inquiry',
				'hearing',
				'decision'
			]);
		});

		it('should have correct SharePoint names', () => {
			assert.deepStrictEqual(getCategorySharePointNames(), [
				'Application',
				'LPA Questionnaire',
				'Written Representations',
				'Inquiry',
				'Hearing',
				'Decision'
			]);
		});

		it('should have correct display names for UI', () => {
			assert.deepStrictEqual(getCategoryDisplayNames(), [
				'Application',
				'LPA questionnaire',
				'Written Representations',
				'Inquiry',
				'Hearing',
				'Decision'
			]);
		});

		it('should mark correct categories as alwaysShow', () => {
			const alwaysShow = DOCUMENT_CATEGORIES.filter((cat) => cat.alwaysShow).map((cat) => cat.value);
			assert.deepStrictEqual(alwaysShow, ['application', 'lpaQuestionnaire', 'decision']);
		});

		it('should be frozen (immutable)', () => {
			assert.ok(Object.isFrozen(DOCUMENT_CATEGORIES));
		});
	});

	describe('CATEGORY_SHAREPOINT_TO_VALUE', () => {
		const mappings = [
			{ sharepoint: 'Application', value: 'application' },
			{ sharepoint: 'LPA Questionnaire', value: 'lpaQuestionnaire' },
			{ sharepoint: 'Written Representations', value: 'writtenRepresentations' },
			{ sharepoint: 'Inquiry', value: 'inquiry' },
			{ sharepoint: 'Hearing', value: 'hearing' },
			{ sharepoint: 'Decision', value: 'decision' }
		];

		it('should map SharePoint names to internal values', () => {
			mappings.forEach(({ sharepoint, value }) => {
				assert.strictEqual(CATEGORY_SHAREPOINT_TO_VALUE[sharepoint], value);
			});
		});

		it('should return undefined for unknown SharePoint names', () => {
			assert.strictEqual(CATEGORY_SHAREPOINT_TO_VALUE['Unknown Category'], undefined);
		});

		it('should be frozen (immutable)', () => {
			assert.ok(Object.isFrozen(CATEGORY_SHAREPOINT_TO_VALUE));
		});
	});

	describe('CATEGORY_VALUE_TO_SHAREPOINT', () => {
		const mappings = [
			{ value: 'application', sharepoint: 'Application' },
			{ value: 'lpaQuestionnaire', sharepoint: 'LPA Questionnaire' },
			{ value: 'writtenRepresentations', sharepoint: 'Written Representations' },
			{ value: 'inquiry', sharepoint: 'Inquiry' },
			{ value: 'hearing', sharepoint: 'Hearing' },
			{ value: 'decision', sharepoint: 'Decision' }
		];

		it('should map internal values to SharePoint names', () => {
			mappings.forEach(({ value, sharepoint }) => {
				assert.strictEqual(CATEGORY_VALUE_TO_SHAREPOINT[value], sharepoint);
			});
		});

		it('should return undefined for unknown internal values', () => {
			assert.strictEqual(CATEGORY_VALUE_TO_SHAREPOINT['unknownCategory'], undefined);
		});

		it('should be frozen (immutable)', () => {
			assert.ok(Object.isFrozen(CATEGORY_VALUE_TO_SHAREPOINT));
		});
	});

	describe('Bidirectional mapping consistency', () => {
		it('should allow round-trip conversion SharePoint -> value -> SharePoint', () => {
			DOCUMENT_CATEGORIES.forEach((cat) => {
				const value = CATEGORY_SHAREPOINT_TO_VALUE[cat.sharepointName];
				const sharepointName = CATEGORY_VALUE_TO_SHAREPOINT[value];
				assert.strictEqual(sharepointName, cat.sharepointName);
			});
		});

		it('should allow round-trip conversion value -> SharePoint -> value', () => {
			DOCUMENT_CATEGORIES.forEach((cat) => {
				const sharepointName = CATEGORY_VALUE_TO_SHAREPOINT[cat.value];
				const value = CATEGORY_SHAREPOINT_TO_VALUE[sharepointName];
				assert.strictEqual(value, cat.value);
			});
		});
	});
});

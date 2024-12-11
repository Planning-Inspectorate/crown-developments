import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import UnitOptionEntryQuestion from './question.js';

const TITLE = 'Unit Option Entry question';
const QUESTION = 'A Unit Option Entry question';
const DESCRIPTION = 'A description of a Unit Option Entry question';
const FIELDNAME = 'unit-option-entry-unit';
const CONDITIONAL_FIELDNAME = 'unit-option-entry-quantity';
const HTML = 'some/html/path';
const LABEL = 'a label';
const OPTIONS = [
	{
		text: 'Metres',
		value: 'metres',
		conditional: {
			fieldName: 'unit-option-entry-quantity_metres',
			suffix: 'm'
		}
	},
	{
		text: 'Kilometres',
		value: 'kilometres',
		conditional: {
			fieldName: 'unit-option-entry-quantity_kilometres',
			suffix: 'km',
			conversionFactor: 1000
		}
	}
];

describe('./src/dynamic-forms/components/unit-option-entry/question.js', () => {
	const unitOptionEntryQuestion = new UnitOptionEntryQuestion({
		title: TITLE,
		question: QUESTION,
		description: DESCRIPTION,
		fieldName: FIELDNAME,
		conditionalFieldName: CONDITIONAL_FIELDNAME,
		html: HTML,
		label: LABEL,
		options: OPTIONS
	});

	it('should create', () => {
		assert.strictEqual(unitOptionEntryQuestion.title, TITLE);
		assert.strictEqual(unitOptionEntryQuestion.question, QUESTION);
		assert.strictEqual(unitOptionEntryQuestion.description, DESCRIPTION);
		assert.strictEqual(unitOptionEntryQuestion.fieldName, FIELDNAME);
		assert.strictEqual(unitOptionEntryQuestion.conditionalFieldName, CONDITIONAL_FIELDNAME);
		assert.strictEqual(unitOptionEntryQuestion.viewFolder, 'unit-option-entry');
		assert.strictEqual(unitOptionEntryQuestion.html, HTML);
		assert.strictEqual(unitOptionEntryQuestion.label, LABEL);
		assert.strictEqual(unitOptionEntryQuestion.options, OPTIONS);
	});

	it('should handle decimal string formatting conversion', () => {
		const journey = {
			response: {
				answers: {
					[CONDITIONAL_FIELDNAME]: '1.123456789'
				}
			},
			getCurrentQuestionUrl: mock.fn()
		};
		const result = unitOptionEntryQuestion.formatAnswerForSummary('test', journey, 'ha');
		assert.strictEqual(result[0].value, '1.123456789 ha');
	});
	it('should handle int string formatting conversion', () => {
		const journey = {
			response: {
				answers: {
					[CONDITIONAL_FIELDNAME]: '1'
				}
			},
			getCurrentQuestionUrl: mock.fn()
		};
		const result = unitOptionEntryQuestion.formatAnswerForSummary('test', journey, 'ha');
		assert.strictEqual(result[0].value, '1 ha');
	});
	it('should error for NaN formatting conversion', () => {
		const journey = {
			response: {
				answers: {
					[CONDITIONAL_FIELDNAME]: 'hello'
				}
			},
			getCurrentQuestionUrl: mock.fn()
		};
		assert.throws(() => {
			unitOptionEntryQuestion.formatAnswerForSummary('test', journey, 'ha');
		}, new Error('Conditional answer had an unexpected type'));
	});
});

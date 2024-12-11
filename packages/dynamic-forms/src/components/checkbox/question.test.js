import { describe, it } from 'node:test';
import assert from 'node:assert';
import CheckboxQuestion from './question.js';
import ValidOptionValidator from '../../validator/valid-option-validator.js';

describe('./src/dynamic-forms/components/checkbox/question.js', () => {
	const TITLE = 'title';
	const QUESTION = 'Question?';
	const DESCRIPTION = 'Describe';
	const FIELDNAME = 'field-name';
	const CONDITIONAL_FIELDNAME = 'conditional-field-name';
	const URL = 'url';
	const PAGE_TITLE = 'this appears in <title>';
	const VALIDATORS = [1, 2];
	const OPTIONS = [
		{ text: 'a', value: '1' },
		{ text: 'b', value: '2' },
		{
			text: 'c',
			value: '3',
			conditional: {
				fieldName: CONDITIONAL_FIELDNAME
			}
		}
	];
	const CHECKBOX_PARAMS = {
		title: TITLE,
		question: QUESTION,
		description: DESCRIPTION,
		fieldName: FIELDNAME,
		url: URL,
		pageTitle: PAGE_TITLE,
		validators: VALIDATORS,
		options: OPTIONS
	};
	const CONDITIONAL_ANSWER_TEXT = 'a conditional answer';
	const JOURNEY = {
		response: {
			answers: {}
		}
	};
	JOURNEY.response.answers[`${FIELDNAME}_${CONDITIONAL_FIELDNAME}`] = CONDITIONAL_ANSWER_TEXT;
	it('should create', () => {
		const question = new CheckboxQuestion(CHECKBOX_PARAMS);

		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION);
		assert.strictEqual(question.description, DESCRIPTION);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.viewFolder, 'checkbox');
		assert.strictEqual(question.url, URL);
		assert.strictEqual(question.pageTitle, PAGE_TITLE);
		assert.deepStrictEqual(question.validators, [...VALIDATORS, new ValidOptionValidator()]);
		assert.deepStrictEqual(question.options, OPTIONS);
	});

	it('should return option label when formatAnswerForSummary is called with one answer', () => {
		const question = new CheckboxQuestion(CHECKBOX_PARAMS);
		question.getAction = () => {};
		const formattedAnswer = question.formatAnswerForSummary({}, JOURNEY, '1');
		assert.strictEqual(formattedAnswer[0].value, 'a');
	});

	it('should return formatted option labels when formatAnswerForSummary is called with a string representing several non-conditional answers', () => {
		const question = new CheckboxQuestion(CHECKBOX_PARAMS);
		question.getAction = () => {};
		const formattedAnswer = question.formatAnswerForSummary({}, JOURNEY, '1,2');
		assert.strictEqual(formattedAnswer[0].value, 'a<br>b');
	});

	it('should return formatted option labels when formatAnswerForSummary is called with a string representing several answers including a conditional', () => {
		const question = new CheckboxQuestion(CHECKBOX_PARAMS);
		question.getAction = () => {};
		const formattedAnswer = question.formatAnswerForSummary({}, JOURNEY, '1,2,3');
		assert.strictEqual(formattedAnswer[0].value, `a<br>b<br>c<br>${CONDITIONAL_ANSWER_TEXT}`);
	});

	it('should return a formatted option label when formatAnswerForSummary is called with a single conditional answer', () => {
		const question = new CheckboxQuestion(CHECKBOX_PARAMS);
		const conditionalAnswer = {
			value: '3',
			conditional: CONDITIONAL_ANSWER_TEXT
		};
		question.getAction = () => {};
		const formattedAnswer = question.formatAnswerForSummary({}, JOURNEY, conditionalAnswer);
		assert.strictEqual(formattedAnswer[0].value, `c<br>${CONDITIONAL_ANSWER_TEXT}`);
	});
});

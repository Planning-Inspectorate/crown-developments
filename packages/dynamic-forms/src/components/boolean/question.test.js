import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import BooleanQuestion, { BOOLEAN_OPTIONS, getYesNoValue } from './question.js';

describe('./src/dynamic-forms/components/boolean/question.js', () => {
	const TITLE = 'A boolean question';
	const QUESTION = 'Do you like Tina Turner, Ted?';
	const DESCRIPTION = 'Tina Turner question';
	const FIELDNAME = 'likeTinaTurner';
	const HTML = 'some/path.html';
	const newQuestion = () => {
		return new BooleanQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML
		});
	};
	it('should create', () => {
		const booleanQuestion = newQuestion();
		assert.strictEqual(booleanQuestion.title, TITLE);
		assert.strictEqual(booleanQuestion.question, QUESTION);
		assert.strictEqual(booleanQuestion.description, DESCRIPTION);
		assert.strictEqual(booleanQuestion.fieldName, FIELDNAME);
		assert.strictEqual(booleanQuestion.html, HTML);
		assert.strictEqual(booleanQuestion.options[0].text, 'Yes');
		assert.strictEqual(booleanQuestion.options[0].value, 'yes');
		assert.strictEqual(booleanQuestion.options[1].text, 'No');
		assert.strictEqual(booleanQuestion.options[1].value, 'no');
		assert.strictEqual(booleanQuestion.viewFolder, 'boolean');
	});
	const tests = [
		{ req: BOOLEAN_OPTIONS.YES, expect: true },
		{ req: BOOLEAN_OPTIONS.NO, expect: false },
		{ req: '', expect: false },
		{ req: 'some-string', expect: false }
	];
	for (const t of tests) {
		it(`converts '${t.req}' to boolean`, async () => {
			const booleanQuestion = newQuestion();
			const data = await booleanQuestion.getDataToSave(
				{
					body: {
						[FIELDNAME]: t.req
					}
				},
				{ answers: {} }
			);
			assert.strictEqual(data.answers[FIELDNAME], t.expect);
		});
	}

	const renderTests = [
		{ answers: {}, yesChecked: false, noChecked: false },
		{ answers: { [FIELDNAME]: BOOLEAN_OPTIONS.YES }, yesChecked: true, noChecked: false },
		{ answers: { [FIELDNAME]: BOOLEAN_OPTIONS.NO }, yesChecked: false, noChecked: true }
	];
	for (const t of renderTests) {
		it(`should render with ${JSON.stringify(t.answers)}`, async () => {
			const booleanQuestion = newQuestion();
			const res = {
				render: mock.fn()
			};
			const viewModel = booleanQuestion.prepQuestionForRendering(
				{},
				{
					getBackLink: mock.fn(),
					response: { answers: t.answers }
				}
			);
			booleanQuestion.renderAction(res, viewModel);
			assert.strictEqual(res.render.mock.callCount(), 1);
			const args = res.render.mock.calls[0].arguments;
			assert.strictEqual(args[0], 'components/boolean/index');
			assert.deepStrictEqual(args[1].question.fieldName, FIELDNAME);
			assert.deepStrictEqual(args[1].question.options[0].value, BOOLEAN_OPTIONS.YES);
			assert.deepStrictEqual(args[1].question.options[0].checked, t.yesChecked);
			assert.deepStrictEqual(args[1].question.options[1].value, BOOLEAN_OPTIONS.NO);
			assert.deepStrictEqual(args[1].question.options[1].checked, t.noChecked);
		});
	}

	const getYesNoValueTestCases = [
		{ req: true, expect: BOOLEAN_OPTIONS.YES },
		{ req: false, expect: BOOLEAN_OPTIONS.NO }
	];
	for (const t of getYesNoValueTestCases) {
		it(`converts '${t.req}' to Yes/No`, () => {
			assert.strictEqual(getYesNoValue(t.req), t.expect);
		});
	}
});

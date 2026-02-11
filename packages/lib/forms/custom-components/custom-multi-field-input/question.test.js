import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import CustomMultiFieldInputQuestion from './question.js';

const baseParameters = {
	title: 'Contact details',
	section: 'application',
	fieldName: 'contactDetails',
	question: 'What are the contact details?',
	url: '/application/contact',
	journeyId: 'journey-1'
};

const buildQuestion = (overrides = {}) => {
	const question = new CustomMultiFieldInputQuestion({
		...baseParameters,
		inputAttributes: { 'data-test': 'attr' },
		inputFields: [
			{ fieldName: 'firstName', label: 'First name' },
			{ fieldName: 'lastName', label: 'Last name', formatPrefix: 'Last: ' },
			{
				fieldName: 'contactMethod',
				label: 'Preferred contact method',
				options: [
					{ text: 'Email', value: 'email' },
					{ text: 'Phone', value: 'phone' }
				]
			},
			{ type: 'hidden', fieldName: 'hiddenMeta', value: 'abc123' }
		],
		...overrides
	});
	// Helper to mock getAction if not already mocked, to avoid repetitive code in tests

	question.getAction = () => ({ href: '/edit', text: 'Change', visuallyHiddenText: 'Contact details' });

	return question;
};

const buildJourneyWithAnswers = (answers = {}) => ({
	response: { answers }
});

describe('CustomMultiFieldInputQuestion', () => {
	test('throws when inputFields are missing', () => {
		assert.throws(
			() =>
				new CustomMultiFieldInputQuestion({
					...baseParameters
				}),
			/inputFields are mandatory/
		);
	});

	test('answerForViewModel returns values for input fields and preserves hidden fields', () => {
		const question = buildQuestion();
		const answers = {
			firstName: 'Alice',
			lastName: 'Smith',
			contactMethod: 'email',
			hiddenMeta: 'overwriting this value should have no effect'
		};
		const viewAnswers = question.answerForViewModel(answers);

		assert.deepEqual(viewAnswers, [
			{ fieldName: 'firstName', label: 'First name', value: 'Alice' },
			{ fieldName: 'lastName', label: 'Last name', formatPrefix: 'Last: ', value: 'Smith' },
			{
				fieldName: 'contactMethod',
				label: 'Preferred contact method',
				options: [
					{ text: 'Email', value: 'email' },
					{ text: 'Phone', value: 'phone' }
				],
				value: 'email'
			},
			{ type: 'hidden', fieldName: 'hiddenMeta', value: 'abc123' }
		]);
	});

	test('answerForViewModel applies formatTextFunction when provided and value exists', () => {
		const question = buildQuestion({
			inputFields: [
				{
					fieldName: 'firstName',
					label: 'First name',
					formatTextFunction: (value) => value.toUpperCase()
				}
			]
		});
		const result = question.answerForViewModel({ firstName: 'Alice' });
		assert.equal(result[0].value, 'ALICE');
		assert.equal(result[0].label, 'First name');
	});

	test('answerForViewModel does not format falsy values', () => {
		const question = buildQuestion({
			inputFields: [
				{
					fieldName: 'firstName',
					label: 'First name',
					formatTextFunction: () => 'SHOULD_NOT_APPLY'
				}
			]
		});
		assert.equal(question.answerForViewModel({ firstName: '' })[0].value, '');
		assert.equal(question.answerForViewModel({ firstName: undefined })[0].value, undefined);
	});

	test('addCustomDataToViewModel sets label and attributes', () => {
		const question = buildQuestion({ label: 'Enter your contact details' });
		const viewModel = { question: {} };
		question.addCustomDataToViewModel(viewModel);
		assert.equal(viewModel.question.label, 'Enter your contact details');
		assert.deepEqual(viewModel.question.attributes, { 'data-test': 'attr' });
	});

	test('getDataToSave trims string values and preserves non-string values', async () => {
		const question = buildQuestion({
			inputFields: [
				{ fieldName: 'name', label: 'Name' },
				{ fieldName: 'age', label: 'Age' }
			]
		});
		const request = { body: { name: '  Bob  ', age: 42 } };
		const result = await question.getDataToSave(request, {});
		assert.deepEqual(result, { answers: { name: 'Bob', age: 42 } });
	});

	test('formatAnswerForSummary returns not started when all unanswered', () => {
		const question = buildQuestion();
		question.notStartedText = 'Not started';

		const summary = question.formatAnswerForSummary('application', buildJourneyWithAnswers({}));
		assert.equal(summary[0].key, 'Contact details');
		assert.ok(String(summary[0].value).includes('Not started'));
		assert.deepEqual(summary[0].action, { href: '/edit', text: 'Change', visuallyHiddenText: 'Contact details' });
	});

	test('formatAnswerForSummary concatenates answers with prefix and line breaks', () => {
		const question = buildQuestion();

		const summary = question.formatAnswerForSummary(
			'segment',
			buildJourneyWithAnswers({ firstName: 'Alice', lastName: 'Smith', contactMethod: 'email' })
		);

		assert.ok(String(summary[0].value).includes('Alice<br>'));
		assert.ok(String(summary[0].value).includes('Last: Smith<br>'));
		assert.ok(String(summary[0].value).includes('email<br>'));
	});

	test('formatAnswerForSummary uses custom formatJoinString', () => {
		const question = buildQuestion({
			inputFields: [
				{ fieldName: 'a', label: 'A', formatJoinString: ' | ' },
				{ fieldName: 'b', label: 'B' } // Default join string is \n
			]
		});

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ a: 'Apple', b: 'Banana' }));
		assert.equal(summary[0].value, 'Apple | Banana<br>');
	});

	test('formatAnswerForSummary escapes HTML and avoids double <br> in manage list section', () => {
		const question = buildQuestion({
			inputFields: [{ fieldName: 'bio', label: 'Bio' }]
		});
		question.isInManageListSection = true;

		const summary = question.formatAnswerForSummary(
			'segment',
			buildJourneyWithAnswers({ bio: 'Hello <b>World</b>\nLine2' })
		);
		assert.equal(summary[0].value, 'Hello &lt;b&gt;World&lt;/b&gt;<br>Line2\n');
	});

	test('formatAnswerForSummary returns empty string when some unanswered but not all', () => {
		const question = buildQuestion({
			inputFields: [
				{ fieldName: 'firstName', label: 'First name' },
				{ fieldName: 'lastName', label: 'Last name' }
			]
		});

		const summary = question.formatAnswerForSummary(
			'segment',
			buildJourneyWithAnswers({ firstName: undefined, lastName: '' })
		);
		assert.equal(summary[0].value, '');
	});

	test('allQuestionsUnanswered returns true only when every input field is undefined', () => {
		const question = buildQuestion({
			inputFields: [
				{ fieldName: 'a', label: 'A' },
				{ fieldName: 'b', label: 'B' }
			]
		});
		question.notStartedText = 'Not started';

		const journeyAllUndefined = buildJourneyWithAnswers({ a: undefined, b: undefined });
		const journeyOneDefined = buildJourneyWithAnswers({ a: undefined, b: '' });
		const summaryAllUndefined = question.formatAnswerForSummary('segment', journeyAllUndefined);
		const summaryOneDefined = question.formatAnswerForSummary('segment', journeyOneDefined);

		assert.ok(String(summaryAllUndefined[0].value).includes('Not started'));
		assert.equal(summaryOneDefined[0].value, '');
	});

	test('formatting function is applied only when value is truthy', () => {
		const question = buildQuestion({
			inputFields: [{ fieldName: 'x', label: 'X', formatTextFunction: (value) => `Value:${value}` }]
		});
		const answersTruthy = question.answerForViewModel({ x: 'hello' })[0].value;
		const answersFalsyEmpty = question.answerForViewModel({ x: '' })[0].value;
		const answersFalsyUndefined = question.answerForViewModel({ x: undefined })[0].value;
		assert.equal(answersTruthy, 'Value:hello');
		assert.equal(answersFalsyEmpty, '');
		assert.equal(answersFalsyUndefined, undefined);
	});
});

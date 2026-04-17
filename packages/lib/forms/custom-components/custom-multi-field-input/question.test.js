import { describe, it } from 'node:test';
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
	it('should throw error when inputFields are missing', () => {
		assert.throws(
			() =>
				new CustomMultiFieldInputQuestion({
					...baseParameters
				}),
			/inputFields are mandatory/
		);
	});

	it('should return values for input fields and preserve hidden fields', () => {
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

	it('should apply formatTextFunction when provided and value exists', () => {
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

	it('should not format falsy values', () => {
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

	it('should set label and attributes in view model', () => {
		const question = buildQuestion({ label: 'Enter your contact details' });
		const viewModel = { question: {} };
		question.addCustomDataToViewModel(viewModel);
		assert.equal(viewModel.question.label, 'Enter your contact details');
		assert.deepEqual(viewModel.question.attributes, { 'data-test': 'attr' });
	});

	it('should trim string values and preserve non-string values when saving data', async () => {
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

	it('should return not started when all unanswered', () => {
		const question = buildQuestion();
		question.notStartedText = 'Not started';

		const summary = question.formatAnswerForSummary('application', buildJourneyWithAnswers({}));
		assert.equal(summary[0].key, 'Contact details');
		assert.ok(String(summary[0].value).includes('Not started'));
		assert.deepEqual(summary[0].action, { href: '/edit', text: 'Change', visuallyHiddenText: 'Contact details' });
	});

	it('should concatenate answers with prefix and line breaks', () => {
		const question = buildQuestion();

		const summary = question.formatAnswerForSummary(
			'segment',
			buildJourneyWithAnswers({ firstName: 'Alice', lastName: 'Smith', contactMethod: 'email' })
		);

		assert.ok(String(summary[0].value).includes('Alice<br>'));
		assert.ok(String(summary[0].value).includes('Last: Smith<br>'));
		assert.ok(String(summary[0].value).includes('email<br>'));
	});

	it('should use custom formatJoinString', () => {
		const question = buildQuestion({
			inputFields: [
				{ fieldName: 'a', label: 'A', formatJoinString: ' | ' },
				{ fieldName: 'b', label: 'B' } // Default join string is \n
			]
		});

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ a: 'Apple', b: 'Banana' }));
		assert.equal(summary[0].value, 'Apple | Banana<br>');
	});

	it('should escape HTML and avoid double br in manage list section', () => {
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

	it('should return empty string when some unanswered but not all', () => {
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

	it('should return true only when every input field is undefined', () => {
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

	it('should apply formatting function only when value is truthy', () => {
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

	it('should handle boolean field with default options', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?'
				}
			]
		});
		const viewAnswers = question.answerForViewModel({ hasAgent: 'yes' });

		assert.equal(viewAnswers[0].type, 'boolean');
		assert.equal(viewAnswers[0].fieldName, 'hasAgent');
		assert.equal(viewAnswers[0].question, 'Do you have an agent?');
		assert.deepEqual(viewAnswers[0].options, [
			{ text: 'Yes', value: 'yes', checked: true },
			{ text: 'No', value: 'no', checked: false }
		]);
	});

	it('should handle boolean field with no answer selected', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?'
				}
			]
		});
		const viewAnswers = question.answerForViewModel({ hasAgent: undefined });

		assert.deepEqual(viewAnswers[0].options, [
			{ text: 'Yes', value: 'yes', checked: false },
			{ text: 'No', value: 'no', checked: false }
		]);
	});

	it('should handle boolean field with no selected', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?'
				}
			]
		});
		const viewAnswers = question.answerForViewModel({ hasAgent: 'no' });

		assert.deepEqual(viewAnswers[0].options, [
			{ text: 'Yes', value: 'yes', checked: false },
			{ text: 'No', value: 'no', checked: true }
		]);
	});

	it('should handle boolean field with custom options', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'agreement',
					question: 'Do you agree?',
					options: [
						{ text: 'I agree', value: 'agree' },
						{ text: 'I disagree', value: 'disagree' }
					]
				}
			]
		});
		const viewAnswers = question.answerForViewModel({ agreement: 'agree' });

		assert.deepEqual(viewAnswers[0].options, [
			{ text: 'I agree', value: 'agree', checked: true },
			{ text: 'I disagree', value: 'disagree', checked: false }
		]);
	});

	it('should handle multiple boolean fields', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'field1',
					question: 'Question 1'
				},
				{
					type: 'boolean',
					fieldName: 'field2',
					question: 'Question 2'
				}
			]
		});
		const viewAnswers = question.answerForViewModel({ field1: 'yes', field2: 'no' });

		assert.equal(viewAnswers[0].options[0].checked, true);
		assert.equal(viewAnswers[0].options[1].checked, false);
		assert.equal(viewAnswers[1].options[0].checked, false);
		assert.equal(viewAnswers[1].options[1].checked, true);
	});

	it('should handle boolean field with yes answer in summary', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?',
					options: [
						{ text: 'Yes', value: 'yes' },
						{ text: 'No', value: 'no' }
					]
				}
			]
		});

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ hasAgent: 'yes' }));
		assert.ok(String(summary[0].value).includes('Yes'));
	});

	it('should handle boolean field with no answer in summary', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?',
					options: [
						{ text: 'Yes', value: 'yes' },
						{ text: 'No', value: 'no' }
					]
				}
			]
		});

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ hasAgent: 'no' }));
		assert.ok(String(summary[0].value).includes('No'));
	});

	it('should handle boolean field with custom options in summary', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'agreement',
					question: 'Do you agree?',
					options: [
						{ text: 'I agree', value: 'agree' },
						{ text: 'I disagree', value: 'disagree' }
					]
				}
			]
		});

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ agreement: 'agree' }));
		assert.ok(String(summary[0].value).includes('I agree'));
	});

	it('should handle boolean field with undefined answer in summary', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?',
					options: [
						{ text: 'Yes', value: 'yes' },
						{ text: 'No', value: 'no' }
					]
				}
			]
		});
		question.notStartedText = 'Not started';

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ hasAgent: undefined }));
		assert.ok(String(summary[0].value).includes('Not started'));
	});

	it('should handle mixed field types including boolean in summary', () => {
		const question = buildQuestion({
			inputFields: [
				{ fieldName: 'name', label: 'Name' },
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?',
					options: [
						{ text: 'Yes', value: 'yes' },
						{ text: 'No', value: 'no' }
					]
				}
			]
		});

		const summary = question.formatAnswerForSummary(
			'segment',
			buildJourneyWithAnswers({ name: 'Alice', hasAgent: 'yes' })
		);
		assert.ok(String(summary[0].value).includes('Alice'));
		assert.ok(String(summary[0].value).includes('Yes'));
	});

	it('should handle boolean field values when saving data', async () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?'
				}
			]
		});
		const request = { body: { hasAgent: 'yes' } };
		const result = await question.getDataToSave(request, {});
		assert.deepEqual(result, { answers: { hasAgent: 'yes' } });
	});

	it('should handle boolean field with hint', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?',
					hint: 'This is a helpful hint'
				}
			]
		});
		const viewAnswers = question.answerForViewModel({ hasAgent: 'yes' });

		assert.equal(viewAnswers[0].hint, 'This is a helpful hint');
	});

	it('should handle boolean field with formatPrefix in summary', () => {
		const question = buildQuestion({
			inputFields: [
				{
					type: 'boolean',
					fieldName: 'hasAgent',
					question: 'Do you have an agent?',
					formatPrefix: 'Agent: ',
					options: [
						{ text: 'Yes', value: 'yes' },
						{ text: 'No', value: 'no' }
					]
				}
			]
		});

		const summary = question.formatAnswerForSummary('segment', buildJourneyWithAnswers({ hasAgent: 'yes' }));
		assert.ok(String(summary[0].value).includes('Agent: Yes'));
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import TextEntryDetailsQuestion from './question.js';

describe('./src/dynamic-forms/components/text-entry-details/question.js', () => {
	const TITLE = 'title';
	const QUESTION = 'Question?';
	const FIELDNAME = 'field-name';
	const VALIDATORS = [1, 2];
	const HTML = '/path/to/html.njk';
	const HINT = 'hint';
	const LABEL = 'A label';

	function createQuestion() {
		return new TextEntryDetailsQuestion({
			title: TITLE,
			question: QUESTION,
			fieldName: FIELDNAME,
			validators: VALIDATORS,
			html: HTML,
			hint: HINT,
			label: LABEL
		});
	}

	it('should create', () => {
		const question = createQuestion();

		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.viewFolder, 'custom-components/representation-comment');
		assert.strictEqual(question.validators, VALIDATORS);
		assert.strictEqual(question.html, HTML);
		assert.strictEqual(question.hint, HINT);
		assert.strictEqual(question.label, LABEL);
	});
	it('should prep question for rendering', () => {
		const question = createQuestion();
		const journey = {
			baseUrl: '',
			taskListUrl: 'task',
			journeyTemplate: 'template',
			journeyTitle: 'title',
			journeyId: 'manage-representations',
			getBackLink: () => {
				return 'back';
			},
			response: {
				answers: {
					'field-name': 'a representation comment'
				}
			}
		};

		const viewModel = question.prepQuestionForRendering('section', journey, {});

		assert.deepStrictEqual(viewModel.question, {
			value: 'a representation comment',
			question: 'Question?',
			fieldName: 'field-name',
			pageTitle: 'Question?',
			description: undefined,
			html: '/path/to/html.njk',
			hint: 'hint',
			interfaceType: undefined,
			autocomplete: undefined,
			label: 'A label',
			textEntryCheckbox: undefined
		});
	});
	it('should truncate when formating answer for summary when length more than 500', () => {
		const question = createQuestion();
		const journey = {
			baseUrl: '',
			taskListUrl: 'task',
			journeyTemplate: 'template',
			journeyTitle: 'title',
			journeyId: 'manage-representations',
			getBackLink: () => {
				return 'back';
			},
			getCurrentQuestionUrl: () => {
				return '/redacted-comment';
			},
			response: {
				answers: {}
			}
		};
		const answer =
			'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. Johnathan Le-Smithard adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; Johnathan Le-Smithard wrote in his notebook, letting the day delay his errands, wholly unhurried and serene.';

		const viewModel = question.formatAnswerForSummary('section', journey, answer);

		assert.deepStrictEqual(viewModel, [
			{
				key: 'title',
				value:
					'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. Johnathan Le-Smithard adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; Johnathan Le-Smithard wrote in his notebook, letting the day delay his errands, who... <a class="govuk-link govuk-link--no-visited-state" href="/redacted-comment">Read more</a>',
				action: {
					href: '/redacted-comment',
					text: 'Change',
					visuallyHiddenText: 'Question?'
				}
			}
		]);
	});
	it('should not truncate when formating answer for summary when length less than 500', () => {
		const question = createQuestion();
		const journey = {
			baseUrl: '',
			taskListUrl: 'task',
			journeyTemplate: 'template',
			journeyTitle: 'title',
			journeyId: 'manage-representations',
			getBackLink: () => {
				return 'back';
			},
			getCurrentQuestionUrl: () => {
				return '/redacted-comment';
			},
			response: {
				answers: {}
			}
		};
		const answer =
			'It began, as many stories do, with an ordinary morning. The air carried the faint smell of dew, and the street was empty save for a few scattered leaves drifting lazily in the wind. Jonathan Price adjusted his collar and glanced at his watch, noting with mild irritation that they were three minutes late.';

		const viewModel = question.formatAnswerForSummary('section', journey, answer);

		assert.deepStrictEqual(viewModel, [
			{
				key: 'title',
				value:
					'It began, as many stories do, with an ordinary morning. The air carried the faint smell of dew, and the street was empty save for a few scattered leaves drifting lazily in the wind. Jonathan Price adjusted his collar and glanced at his watch, noting with mild irritation that they were three minutes late.',
				action: {
					href: '/redacted-comment',
					text: 'Change',
					visuallyHiddenText: 'Question?'
				}
			}
		]);
	});
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import TableManageListQuestion from './question.ts';
import { DateQuestion } from '@planning-inspectorate/dynamic-forms';
import type { Journey, Question, QuestionViewModel, Section } from '@planning-inspectorate/dynamic-forms';

type ActionLink = {
	href?: string;
	text?: string;
	visuallyHiddenText?: string;
};

type SummaryListItem = {
	key?: string;
	value: string;
	action?: unknown;
};

describe('TableManageListQuestion', () => {
	let tableQuestion: TableManageListQuestion;
	let mockViewModel: QuestionViewModel;

	beforeEach(() => {
		tableQuestion = new TableManageListQuestion({
			title: 'Test Table',
			fieldName: 'testTable',
			titleSingular: 'Item',
			question: 'What items do you want to add?'
		} as any);

		tableQuestion.section = {
			questions: [
				{ title: 'Name', viewData: { tableHeader: 'Full Name' }, fieldName: 'name' },
				{ title: 'Date of Birth', fieldName: 'dob' }
			]
		} as unknown as Section;

		mockViewModel = {
			question: {
				value: [
					{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' },
					{ id: 'uuid-2', name: 'Jane Doe', dob: '1985-05-15' }
				],
				firstQuestionUrl: 'name-page'
			},
			originalUrl: '/my-url/',
			util: {
				trimTrailingSlash: (url: string) => url.replace(/\/$/, '')
			}
		} as unknown as QuestionViewModel;
	});

	describe('Constructor', () => {
		it('should set the custom view folder', () => {
			assert.strictEqual(tableQuestion.viewFolder, 'custom-components/manage-list/table');
		});
	});

	describe('createRows()', () => {
		it('should support a single item object in question.value', () => {
			tableQuestion.section!.questions.forEach((q) => {
				q.formatAnswerForSummary = () => [{ value: 'Mock Answer' }] as unknown;
			});

			mockViewModel.question.value = { id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' } as unknown;

			const rows = (tableQuestion as any).createRows(mockViewModel);

			assert.strictEqual(rows.length, 1);
			assert.strictEqual(rows[0].length, 3);
		});
	});

	describe('createHeaders()', () => {
		it('should generate headers with aria-sort and an Actions column', () => {
			const headers = tableQuestion.createHeaders();

			assert.strictEqual(headers.length, 3);

			assert.strictEqual(headers[0].text, 'Full Name');
			assert.deepStrictEqual(headers[0].attributes, { 'aria-sort': 'none' });

			assert.strictEqual(headers[1].text, 'Date of Birth');

			assert.strictEqual(headers[2].text, 'Actions');
			assert.strictEqual(headers[2].classes, 'govuk-!-width-one-quarter');
		});
	});

	describe('createCell()', () => {
		it('should return a dash if shouldDisplay returns false', () => {
			const hiddenQuestion = {
				fieldName: 'secret',
				shouldDisplay: () => false
			} as unknown as Question;

			const result = tableQuestion.createCell(hiddenQuestion, { secret: 'hidden' });

			assert.strictEqual(result.text, '-');
			assert.strictEqual(result.html, undefined);
		});

		it('should render standard question values with text as sort value', () => {
			const mockQuestion = {
				fieldName: 'name',
				formatAnswerForSummary: () => [{ value: 'John' }, { value: 'Doe' }]
			} as unknown as Question;

			const result = tableQuestion.createCell(mockQuestion, { name: 'John Doe' });

			assert.strictEqual(result.html, 'John, Doe');
			assert.strictEqual(result.classes, 'govuk-table__cell');
			assert.deepStrictEqual(result.attributes, { 'data-sort-value': 'John, Doe' });
		});

		it('should convert DateQuestion values to a unix timestamp for sorting', () => {
			const dateQuestion = new DateQuestion({
				title: 'Date',
				fieldName: 'dob',
				question: 'What is the date of birth?'
			} as any) as unknown as Question;

			dateQuestion.formatAnswerForSummary = () => [{ value: '1990-01-01' }] as any;

			const result = tableQuestion.createCell(dateQuestion, { dob: '1990-01-01' });

			assert.strictEqual(result.html, '1990-01-01');
			assert.strictEqual(result.attributes?.['data-sort-value'], new Date('1990-01-01').getTime().toString());
		});
	});

	describe('visibleQuestionsForItem()', () => {
		it('returns every question when none declares shouldDisplay', () => {
			assert.strictEqual(tableQuestion.visibleQuestionsForItem({}).length, 2);
		});

		it("filters by the item's own answers, not the journey's", () => {
			tableQuestion.section!.questions[1].shouldDisplay = ((r: any) => r.answers.name === 'John Doe') as never;

			assert.deepStrictEqual(
				tableQuestion.visibleQuestionsForItem({ name: 'John Doe' }).map((q) => q.fieldName),
				['name', 'dob']
			);
			assert.deepStrictEqual(
				tableQuestion.visibleQuestionsForItem({ name: 'Jane Doe' }).map((q) => q.fieldName),
				['name']
			);
		});
	});

	describe('generateActionsHtml()', () => {
		it('should generate correct edit and remove links with the originalUrl by default', () => {
			const item = { id: 'item-123' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/edit/item-123/name-page"'));
			assert.ok(html.includes('href="/my-url/remove/item-123/confirm"'));
			assert.ok(html.includes('Change<span class="govuk-visually-hidden"> row</span>'));
			assert.ok(html.includes('Remove<span class="govuk-visually-hidden"> row</span>'));
		});

		it('should hide the remove link if hideRemoveOnLastItem is true and there is only 1 item left', () => {
			tableQuestion.hideRemoveOnLastItem = true;
			mockViewModel.question.value = [{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' }];

			const item = { id: 'uuid-1' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/edit/uuid-1/name-page"'));
			assert.strictEqual(html.includes('href="/my-url/remove/uuid-1/confirm"'), false);
			assert.strictEqual(html.includes('Remove<span class="govuk-visually-hidden"> row</span>'), false);
		});

		it('should display the remove link if hideRemoveOnLastItem is true but there are multiple items', () => {
			tableQuestion.hideRemoveOnLastItem = true;

			const item = { id: 'uuid-1' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/remove/uuid-1/confirm"'));
		});

		it('should display the remove link if there is only 1 item left but hideRemoveOnLastItem is false', () => {
			tableQuestion.hideRemoveOnLastItem = false;
			mockViewModel.question.value = [{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' }];

			const item = { id: 'uuid-1' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/remove/uuid-1/confirm"'));
		});

		it('should make Remove a button posting to the remove URL when removeWithoutConfirmation is set', () => {
			tableQuestion.removeWithoutConfirmation = true;

			const html = tableQuestion.generateActionsHtml(mockViewModel, { id: 'uuid-1' });

			assert.match(
				html,
				/<button type="submit" class="govuk-link pins-button-link" formaction="\/my-url\/remove\/uuid-1\/confirm"/
			);
			assert.strictEqual(html.includes('href="/my-url/remove/uuid-1/confirm"'), false);
			assert.ok(html.includes('href="/my-url/edit/uuid-1/name-page"'));
		});

		it('should still hide Remove on the last item when removeWithoutConfirmation is set', () => {
			tableQuestion.removeWithoutConfirmation = true;
			tableQuestion.hideRemoveOnLastItem = true;
			mockViewModel.question.value = [{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' }];

			const html = tableQuestion.generateActionsHtml(mockViewModel, { id: 'uuid-1' });

			assert.strictEqual(html.includes('formaction'), false);
		});
	});

	describe('maximumAnswers', () => {
		it('should hide the add button once the list is full', () => {
			const full = new TableManageListQuestion({
				title: 'Test Table',
				fieldName: 'testTable',
				titleSingular: 'Item',
				question: 'q',
				maximumAnswers: 2
			} as any);
			full.section = tableQuestion.section;
			full.section!.questions.forEach((q) => {
				q.shouldDisplay = () => true;
				q.formatAnswerForSummary = () => [{ value: 'x' } as SummaryListItem];
			});

			full.addCustomDataToViewModel(mockViewModel);
			assert.strictEqual(mockViewModel.hideAddButton, true);

			mockViewModel.question.value = [{ id: 'uuid-1' }];
			full.addCustomDataToViewModel(mockViewModel);
			assert.strictEqual(mockViewModel.hideAddButton, false);
		});
		it('should never be full without a maximum', () => {
			assert.strictEqual(tableQuestion.isFull(Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }))), false);
		});
	});

	describe('addCustomDataToViewModel()', () => {
		it('should populate viewModel with tableHead, tableRows, and button text', () => {
			tableQuestion.section!.questions[0].shouldDisplay = () => true;
			tableQuestion.section!.questions[1].shouldDisplay = () => true;

			tableQuestion.section!.questions[0].formatAnswerForSummary = () => [{ value: 'Ans 1' } as SummaryListItem];
			tableQuestion.section!.questions[1].formatAnswerForSummary = () => [{ value: 'Ans 2' } as SummaryListItem];

			tableQuestion.addCustomDataToViewModel(mockViewModel);

			assert.strictEqual(mockViewModel.continueButtonText, 'Save and continue');
			assert.strictEqual(mockViewModel.addMoreButtonText, 'Add details');
			assert.strictEqual(mockViewModel.addAnotherLinkText, undefined);

			assert.strictEqual(mockViewModel.question.tableHead?.length, 3);
			assert.strictEqual(mockViewModel.question.tableRows?.length, 2);

			assert.strictEqual(mockViewModel.question.tableRows[0].length, 3);
			assert.strictEqual(mockViewModel.question.tableRows[0][0].html, 'Ans 1');
		});

		it('should throw an error if section is not set', () => {
			tableQuestion.section = undefined as unknown as Section;

			assert.throws(() => {
				tableQuestion.addCustomDataToViewModel(mockViewModel);
			}, /manage list section not set/);
		});
	});

	describe('renderConfirmationAction()', () => {
		/** Renders the remove page, returning the view and the model it was given */
		const renderRemovePage = (question: TableManageListQuestion, item: Record<string, string>) => {
			let rendered: { view: string; model: Record<string, unknown> } | undefined;
			const res = {
				render: (view: string, model: Record<string, unknown>) => {
					rendered = { view, model };
				}
			};
			question.renderConfirmationAction(res as never, { id: 'uuid-1', ...item }, {
				question: {}
			} as unknown as QuestionViewModel);
			assert.ok(rendered, 'nothing rendered');
			return rendered;
		};

		it('should describe the item with removalSummary when set', () => {
			const question = new TableManageListQuestion({
				title: 'Test Table',
				fieldName: 'testTable',
				titleSingular: 'Item',
				question: 'Check items',
				removalSummary: (item: Record<string, unknown>) => [`<strong>${String(item.name)}</strong>`, 'second line']
			} as never);

			const { view, model } = renderRemovePage(question, { name: 'First' });

			assert.strictEqual(view, 'custom-components/manage-list/table/confirm');
			assert.deepStrictEqual(model.questionSummary, [{ answer: '<strong>First</strong>' }, { answer: 'second line' }]);
		});

		it("should describe the item with the sub-questions' summaries otherwise", () => {
			tableQuestion.section!.questions.forEach((q) => {
				q.shouldDisplay = () => true;
				q.formatAnswerForSummary = () => [{ value: 'from sub-question' } as SummaryListItem];
			});

			const { model } = renderRemovePage(tableQuestion, {});

			const answers = (model.questionSummary as { answer: string }[]).map((line) => line.answer);
			assert.ok(answers.length > 0 && answers.every((answer) => answer === 'from sub-question'));
		});
	});

	describe('formatAnswerForSummary()', () => {
		it('should return notStartedText when answer is an empty array', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;
			(tableQuestion as unknown as { notStartedText: string }).notStartedText = 'Not started yet';

			const result = tableQuestion.formatAnswerForSummary('segment', mockJourney, []);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, 'Not started yet');
		});

		it('should return notStartedText when answer is null', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;
			(tableQuestion as unknown as { notStartedText: string }).notStartedText = 'No items added';

			const result = tableQuestion.formatAnswerForSummary('segment', mockJourney, null);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, 'No items added');
		});
	});

	describe('getAction()', () => {
		it('should return an action with "Add" text when the answer array is empty', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;

			const result = tableQuestion.getAction('segment', mockJourney, []) as ActionLink;

			assert.strictEqual(result?.text, 'Answer');
			assert.strictEqual(result?.visuallyHiddenText, 'What items do you want to add?');
		});

		it('should return an action with "Change" text when the answer array has items', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;

			const result = tableQuestion.getAction('segment', mockJourney, [{ id: '123' }]) as ActionLink;

			assert.strictEqual(result?.text, 'Change');
			assert.strictEqual(result?.visuallyHiddenText, 'What items do you want to add?');
		});

		it('should return an action with "Add" text when the answer is null', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;

			const result = tableQuestion.getAction('segment', mockJourney, null) as ActionLink;

			assert.strictEqual(result?.text, 'Answer');
			assert.strictEqual(result?.visuallyHiddenText, 'What items do you want to add?');
		});
	});
});

import { type ActionView, DateQuestion, ManageListQuestion } from '@planning-inspectorate/dynamic-forms';
import type { CommonQuestionParams } from '@planning-inspectorate/dynamic-forms';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Question, QuestionViewModel } from '@planning-inspectorate/dynamic-forms';
import nunjucks from 'nunjucks';
import type { Request } from 'express';
import type { TableHeadCell, TableManageListQuestionParameters, TableRowCell } from './types.ts';

type TableQuestionViewData = {
	value?: Record<string, unknown> | Record<string, unknown>[];
	firstQuestionUrl?: string;
	tableHead?: TableHeadCell[];
	tableRows?: TableRowCell[][];
};

/**
 * A manage list rendered as a sortable table rather than a summary list.
 *
 * One column per sub-question, plus an actions column. For control over which
 * columns appear and how cells are built, use DefinedColumnsTableQuestion.
 *
 * TODO: PEAS-XXX — this file carries a number of casts that only exist because
 * dynamic-forms types several things as `any` or declares them differently from
 * how the JavaScript behaves. Once those are fixed upstream the casts should be
 * removed and getAction should return ActionView | ActionView[] | undefined like
 * its parent. Each cast is commented at its site.
 */
export default class TableManageListQuestion extends ManageListQuestion {
	viewFolder: string;
	summaryLimit: number;
	showAnswersInSummary: boolean;
	hideRemoveOnLastItem: boolean;
	confirmRemoveButtonText: string;
	removalPrompt: string;

	constructor(params: TableManageListQuestionParameters & CommonQuestionParams) {
		super(params);

		this.summaryLimit = params.summaryLimit ?? 2;
		this.showAnswersInSummary = params.showAnswersInSummary ?? false;
		this.hideRemoveOnLastItem = params.hideRemoveOnLastItem ?? false;
		this.confirmRemoveButtonText = params.confirmRemoveButtonText || `Remove ${params.titleSingular?.toLowerCase()}`;
		this.removalPrompt =
			params.removalPrompt || `Are you sure you want to remove this ${params.titleSingular?.toLowerCase()}?`;

		this.viewFolder = 'custom-components/manage-list/table';
	}

	/**
	 * Override for parent.
	 *
	 * Only difference is that for payload we pass in the journey response answers.
	 * This is because for manage list questions we don't have the data stored in
	 * the body from an input like a regular question, so the body does not contain
	 * anything useful and it won't repopulate the screen.
	 */
	checkForValidationErrors(
		req: Request,
		section: Section,
		journey: Journey,
		// The base declares this as the module namespace rather than the class,
		// which is a JSDoc slip upstream. `never` keeps the override assignable.
		manageListQuestion?: never
	): QuestionViewModel | undefined {
		const { originalUrl } = req;
		const body = (req.body ?? {}) as {
			errors?: Record<string, unknown>;
			errorSummary?: unknown[];
		};

		const errors = body.errors ?? {};
		const errorSummary = body.errorSummary ?? [];

		if (Object.keys(errors).length > 0) {
			return this.toViewModel({
				// dynamic-forms' RouteParams is narrower than Express's ParamsDictionary
				params: req.params as never,
				section,
				journey,
				customViewData: {
					errors,
					errorSummary,
					originalUrl
				},
				// Use stored answers instead of body for manage list repopulation
				payload: journey.response.answers,
				manageListQuestion
			});
		}
	}

	/**
	 * Override to prepare table data (heads and rows)
	 */
	override addCustomDataToViewModel(viewModel: QuestionViewModel): void {
		if (!this.section) {
			throw new Error('Section not set for TableManageListQuestion');
		}

		super.addCustomDataToViewModel(viewModel);

		this.addButtonText(viewModel);

		const question = viewModel.question as TableQuestionViewData;

		question.tableHead = this.createHeaders();
		question.tableRows = this.createRows(viewModel);

		viewModel.confirmRemoveButtonText = this.confirmRemoveButtonText;
		viewModel.removalPrompt = this.removalPrompt;
	}

	/**
	 * Adds the text for the save, cancel and add buttons.
	 *
	 * At some point we may want to move this into the instantiation of the
	 * classes so each one can have its own button text.
	 */
	private addButtonText(viewModel: QuestionViewModel): void {
		viewModel.continueButtonText = this.viewData?.continueOnly ? 'Continue' : 'Save and continue';
		viewModel.addMoreButtonText = 'Add details';
		viewModel.cancelButtonText = 'Cancel';
	}

	/**
	 * Creates the table rows
	 */
	private createRows(viewModel: QuestionViewModel): TableRowCell[][] {
		const question = viewModel.question as TableQuestionViewData;
		const answers = this.normaliseAnswers(question.value);

		return answers.map((item) => this.createRow(viewModel, item));
	}

	private normaliseAnswers(value: TableQuestionViewData['value']): Record<string, unknown>[] {
		if (Array.isArray(value)) {
			return value;
		}

		if (value && typeof value === 'object') {
			return [value];
		}

		return [];
	}

	/**
	 * Creates a table row based on the questions asked
	 */
	protected createRow(viewModel: QuestionViewModel, item: Record<string, unknown>): TableRowCell[] {
		const questions = this.section?.questions ?? [];

		const cells: TableRowCell[] = questions.map((question: Question) => this.createCell(question, item));

		cells.push({ html: this.generateActionsHtml(viewModel, item) });

		return cells;
	}

	/**
	 * Creates the sortable table headers based on the questions asked
	 */
	createHeaders(): TableHeadCell[] {
		const questions = this.section?.questions ?? [];

		const headers: TableHeadCell[] = questions.map((question) => {
			// viewData is typed `any` upstream
			const viewData = question.viewData as { tableHeader?: string } | undefined;

			return {
				text: viewData?.tableHeader || question.title || question.question,
				attributes: {
					'aria-sort': 'none'
				}
			};
		});

		headers.push({
			text: 'Actions',
			// So that Actions always has enough room for its buttons
			classes: 'govuk-!-width-one-quarter'
		});

		return headers;
	}

	createCell(question: Question, item: Record<string, unknown>): TableRowCell {
		if (!this.shouldDisplayQuestion(question, item)) {
			return { text: '-' };
		}

		const mockJourney = this.buildMockJourney(item);

		const formatted = question.formatAnswerForSummary('', mockJourney, item[question.fieldName]);
		const cellContent = formatted
			.map((answer) => answer.value)
			.filter((value): value is string => typeof value === 'string')
			.join(', ');

		// Most things sort by their cell content, but dates need converting to a timestamp
		const sortValue = question instanceof DateQuestion ? new Date(cellContent).getTime() : cellContent;

		return {
			html: cellContent || '-',
			classes: 'govuk-table__cell',
			attributes: {
				'data-sort-value': sortValue
			}
		};
	}

	/**
	 * Generates the HTML for the actions cell containing the change and remove links
	 */
	generateActionsHtml(viewModel: QuestionViewModel, item: Record<string, unknown>): string {
		const question = viewModel.question as TableQuestionViewData;
		const util = viewModel.util;
		const originalUrl = viewModel.originalUrl as string;

		const originalUrlTrimmed = util.trimTrailingSlash(originalUrl);

		const itemId = typeof item.id === 'string' ? item.id : '';

		const changeUrl = `${originalUrlTrimmed}/edit/${itemId}/${question.firstQuestionUrl}`;
		const removeUrl = `${originalUrlTrimmed}/remove/${itemId}/confirm`;

		const items = this.normaliseAnswers(question.value);
		const removeHtml =
			items.length === 1 && this.hideRemoveOnLastItem
				? ''
				: `
					<li class="govuk-summary-list__actions-list-item">
						<a class="govuk-link" href="${removeUrl}">
							Remove<span class="govuk-visually-hidden"> row</span>
						</a>
					</li>
				`;

		return `
			<ul class="govuk-summary-list__actions-list">
				<li class="govuk-summary-list__actions-list-item">
					<a class="govuk-link" href="${changeUrl}">
						Change<span class="govuk-visually-hidden"> row</span>
					</a>
				</li>
				${removeHtml}
			</ul>`;
	}

	/**
	 * Overrides parent. Behaves similarly, but passes a limit into the template
	 * so the tab summary can hide and show items behind a toggle.
	 */
	formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: unknown) {
		const items = Array.isArray(answer) ? (answer as Record<string, unknown>[]) : null;

		let formattedAnswer = this.notStartedText || 'Not started';

		if (items && items.length) {
			if (this.showAnswersInSummary) {
				const answers = items.map((a) => this.formatItemAnswers(a));

				formattedAnswer = nunjucks.render(`${this.viewFolder}/answer-summary-list.njk`, {
					answers,
					limit: this.summaryLimit
				});
			} else {
				formattedAnswer = `${items.length} ${this.title}`;
			}
		}

		return [
			{
				key: this.title ?? this.question,
				value: formattedAnswer,
				action: this.getAction(sectionSegment, journey, answer) as never
			}
		];
	}

	/**
	 * Formats items to display in the tab summary list
	 */
	protected formatItemAnswers(answer: Record<string, unknown>) {
		const questions = this.section?.questions ?? [];

		if (questions.length === 0) {
			return [];
		}

		const mockJourney = this.buildMockJourney(answer);

		return questions
			.filter((q: Question) => this.shouldDisplayQuestion(q, answer))
			.map((q: Question) => ({
				question: q.title,
				answer: q
					.formatAnswerForSummary('', mockJourney, answer[q.fieldName])
					.map((a) => a.value)
					.filter((value): value is string => typeof value === 'string')
					.join(', ')
			}));
	}

	/**
	 * The base class declares shouldDisplay as taking no arguments, but it is
	 * called with a JourneyResponse at runtime. Cast so the call typechecks.
	 */
	protected shouldDisplayQuestion(question: Question, answers: Record<string, unknown>): boolean {
		const shouldDisplay = question.shouldDisplay as ((response: JourneyResponse) => boolean) | undefined;

		if (!shouldDisplay) {
			return true;
		}

		return shouldDisplay.call(question, this.buildMockResponse(answers));
	}

	/**
	 * Sub-questions expect a journey, but within a manage list item the only
	 * answers in scope are the item's own.
	 */
	protected buildMockJourney(answers: Record<string, unknown>): Journey {
		return {
			getCurrentQuestionUrl: () => '',
			response: { answers },
			answers
		} as unknown as Journey;
	}

	/**
	 * shouldDisplay expects a JourneyResponse, whose constructor takes no
	 * arguments, so the shape is built by cast rather than instantiation.
	 */
	protected buildMockResponse(answers: Record<string, unknown>): JourneyResponse {
		return { answers } as unknown as JourneyResponse;
	}

	/**
	 * For an empty list, defer to the parent with null so the correct
	 * "not started" text and add link are shown.
	 */
	getAction(sectionSegment: string, journey: Journey, answer: unknown): ActionView | ActionView[] | undefined {
		if (Array.isArray(answer) && !answer.length) {
			return super.getAction(sectionSegment, journey, null);
		}

		return super.getAction(sectionSegment, journey, answer);
	}
}

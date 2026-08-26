import { DateQuestion } from '@planning-inspectorate/dynamic-forms';
import type { CommonQuestionParams } from '@planning-inspectorate/dynamic-forms';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Question, QuestionViewModel } from '@planning-inspectorate/dynamic-forms';
import TableManageListQuestion from '../question.ts';
import type { TableHeadCell, TableManageListQuestionParameters, TableRowCell } from '../types.ts';

export interface TableColumn {
	header: string;
	/** The item field this column reads. Also used to find the matching sub-question. */
	fieldName: string;
	/**
	 * Builds the cell content. Takes priority over the sub-question's own
	 * formatter, so a column can combine several fields.
	 */
	format?: (
		value: unknown,
		rowData: Record<string, unknown>,
		params: {
			getQuestion: (fieldName: string) => Question | undefined;
			mockJourney: Journey;
		}
	) => string;
	/** Defaults to sorting on the rendered cell content */
	sortType?: 'date' | 'string' | 'number';
	/** Hides values from summary list if toggled */
	hideInSummary?: boolean;
}

export type DefinedColumnsTableParams = TableManageListQuestionParameters &
	CommonQuestionParams & {
		columns: TableColumn[];
	};

/**
 * A table manage list whose columns are declared explicitly rather than
 * derived from the sub-questions.
 *
 * Each column either maps to a single field, or supplies a format() function
 * so it can combine several - useful where an amount and its unit are stored
 * separately but belong in one cell.
 */
export default class DefinedColumnsTableQuestion extends TableManageListQuestion {
	columns: TableColumn[];

	constructor(params: DefinedColumnsTableParams) {
		super(params);
		this.columns = params.columns ?? [];
	}

	/**
	 * Creates headers from the columns parameter rather than the sub-questions
	 */
	override createHeaders(): TableHeadCell[] {
		const headers: TableHeadCell[] = this.columns.map((col) => ({
			text: col.header,
			attributes: {
				'aria-sort': 'none'
			}
		}));

		headers.push({
			text: 'Actions',
			classes: 'govuk-!-width-one-quarter'
		});

		return headers;
	}

	/**
	 * Creates a row, one cell per declared column
	 */
	override createRow(viewModel: QuestionViewModel, item: Record<string, unknown>): TableRowCell[] {
		const cells: TableRowCell[] = this.columns.map((col) => {
			const linkedQuestion = this.getQuestionByFieldName(col.fieldName);
			const cellContent = this.getFormattedColumnValue(col, item, linkedQuestion, true);

			return {
				html: cellContent || '-',
				classes: 'govuk-table__cell',
				attributes: {
					'data-sort-value': this.handleSorting(cellContent, col, linkedQuestion, item[col.fieldName])
				}
			};
		});

		cells.push({ html: this.generateActionsHtml(viewModel, item) });

		return cells;
	}

	/**
	 * Sorts on the rendered content, unless the value is a date, in which case
	 * it needs converting to a timestamp so the order is chronological.
	 */
	handleSorting(
		cellContent: string,
		col: TableColumn,
		linkedQuestion: Question | undefined,
		rawValue: unknown
	): string | number {
		if (col.sortType === 'date' && rawValue) {
			return new Date(rawValue as string | Date).getTime();
		}

		if (col.sortType === 'number') {
			const numeric = parseFloat(cellContent);
			return Number.isNaN(numeric) ? cellContent : numeric;
		}

		if (linkedQuestion instanceof DateQuestion) {
			return new Date(cellContent).getTime();
		}

		return cellContent;
	}

	/**
	 * Formats items for the tab summary list, using the columns rather than
	 * the sub-questions so the summary matches the table.
	 */
	override formatItemAnswers(answer: Record<string, unknown>) {
		if (this.columns.length === 0) {
			return [];
		}

		return this.columns
			.filter((col) => !col.hideInSummary)
			.map((col) => {
				const linkedQuestion = this.getQuestionByFieldName(col.fieldName);

				return {
					question: col.header,
					answer: this.getFormattedColumnValue(col, answer, linkedQuestion) || '-'
				};
			});
	}

	/**
	 * Priority: the column's own formatter, then the linked question's
	 * formatter, then the raw value.
	 */
	private getFormattedColumnValue(
		col: TableColumn,
		item: Record<string, unknown>,
		linkedQuestion?: Question,
		plain = false
	): string {
		const rawValue = item[col.fieldName];
		const mockJourney = this.buildMockJourney(item);

		if (col.format) {
			return col.format(rawValue, item, {
				mockJourney,
				getQuestion: (fieldName: string) => this.getQuestionByFieldName(fieldName)
			});
		}

		if (linkedQuestion) {
			if (!this.shouldDisplayQuestion(linkedQuestion, item)) {
				return '-';
			}

			// Table cells sit under a column header, so suppress the label and
			// emphasis that the tab summary needs.
			const q = linkedQuestion as Question & { plainFormatting?: boolean };
			const previous = q.plainFormatting;
			q.plainFormatting = plain;

			try {
				return linkedQuestion
					.formatAnswerForSummary('', mockJourney, rawValue)
					.map((a) => (typeof a.value === 'string' ? a.value : ''))
					.filter(Boolean)
					.join(', ');
			} finally {
				q.plainFormatting = previous;
			}
		}

		if (rawValue === undefined || rawValue === null) {
			return '-';
		}

		if (typeof rawValue === 'string') {
			return rawValue;
		}

		if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
			return String(rawValue);
		}

		return '-';
	}

	private getQuestionByFieldName(fieldName: string): Question | undefined {
		const questions = this.section?.questions ?? [];
		return questions.find((q) => q.fieldName === fieldName);
	}
}

import TableManageListQuestion from '../table/question.ts';
import type { CommonQuestionParams, Journey, QuestionViewModel } from '@planning-inspectorate/dynamic-forms';
import type { TableManageListQuestionParameters } from '../table/types.ts';
import type { Response } from 'express';

export interface CardFormatContext {
	getFormatted: (fieldName: string) => string;
}

export interface CardRow {
	label: string;
	/** The item field this row shows. Omit and supply `format` to derive a value. */
	fieldName?: string;
	/** Takes priority over fieldName, so a row can combine or compute values. */
	format?: (item: Record<string, unknown>, params: CardFormatContext) => string;
}

export type CardManageListQuestionParams = TableManageListQuestionParameters &
	CommonQuestionParams & {
		/** Builds each card's title. Defaults to "<titleSingular> <n>". */
		cardTitle?: (item: Record<string, unknown>, params: CardFormatContext) => string;
		/** Rows inside each card. Defaults to one row per sub-question. */
		rows?: CardRow[];
	};

interface CardViewData {
	value?: Record<string, unknown>[];
	firstQuestionUrl?: string;
	cards?: { id: string; title: string; rows: { label: string; value: string }[] }[];
}

function rawValue(value: unknown): string {
	if (typeof value === 'string') return value === '' ? '-' : value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '-';
}

/**
 * A manage list rendered as one summary card per item, with named rows inside.
 */
export default class CardManageListQuestion extends TableManageListQuestion {
	cardTitle?: (item: Record<string, unknown>, params: CardFormatContext) => string;
	rows: CardRow[];

	constructor(params: CardManageListQuestionParams) {
		super(params);
		this.cardTitle = params.cardTitle;
		this.rows = params.rows ?? [];
		this.viewFolder = 'custom-components/manage-list/card';
	}

	override addCustomDataToViewModel(viewModel: QuestionViewModel): void {
		super.addCustomDataToViewModel(viewModel);

		const question = viewModel.question as CardViewData;
		const items = question.value ?? [];

		question.cards = items.map((item, index) => {
			const context = this.formatContext(item);

			return {
				id: typeof item.id === 'string' ? item.id : '',
				title: this.cardTitle
					? this.cardTitle(item, context)
					: `${this.viewData?.titleSingular ?? 'Item'} ${index + 1}`,
				rows: this.buildRows(item, context)
			};
		});
	}

	/**
	 * We need the item named in the prompt, so it is built from the
	 * card title rather than the static titleSingular.
	 */
	override renderConfirmationAction(
		res: Response,
		itemToRemove: Record<string, unknown>,
		viewModel: QuestionViewModel
	): void {
		if (this.cardTitle) {
			viewModel.removalPrompt = `Are you sure you want to remove ${this.cardTitle(itemToRemove, this.formatContext(itemToRemove))}?`;
		}

		super.renderConfirmationAction(res, itemToRemove, viewModel);
	}

	/**
	 * The tab shows a fixed "See details" rather than listing every entry; the
	 * per-occupancy totals beside it are derived separately.
	 *
	 * Overrides formatAnswerForSummary rather than formatAnswer: ManageListQuestion
	 * replaces formatAnswerForSummary outright, building "<n> <title>" or a rendered
	 * summary list, and never calls formatAnswer - so an override there is inherited
	 * but never invoked.
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: unknown) {
		const items = Array.isArray(answer) ? answer : [];

		return [
			{
				key: this.title ?? this.question,
				value: items.length ? 'See details' : this.notStartedText || 'Not started',
				action: this.getAction(sectionSegment, journey, answer) as never
			}
		];
	}

	private buildRows(item: Record<string, unknown>, context: CardFormatContext): { label: string; value: string }[] {
		if (this.rows.length === 0) {
			// No rows configured - fall back to one per sub-question.
			return this.formatItemAnswers(item).map((a) => ({ label: a.question ?? '', value: a.answer || '-' }));
		}

		return this.rows.map((row) => {
			if (row.format) {
				return { label: row.label, value: row.format(item, context) || '-' };
			}
			if (row.fieldName === undefined) {
				return { label: row.label, value: '-' };
			}

			// Prefer the owning question's formatter, so lookup ids, booleans and dates
			// render here exactly as they do everywhere else in the journey.
			const formatted = context.getFormatted(row.fieldName);
			if (formatted) {
				return { label: row.label, value: formatted };
			}

			// Fields owned by a composite question have no question of their own to
			// ask - a single bedroom band lives inside the multi-field input, which
			// only formats all five together.
			return { label: row.label, value: rawValue(item[row.fieldName]) };
		});
	}

	private formatContext(item: Record<string, unknown>): CardFormatContext {
		// section is typed `any` upstream, so we cast once here rather than at each use
		const questions = this.section?.questions ?? [];
		const mockJourney = this.buildMockJourney(item);

		return {
			getFormatted: (fieldName) => {
				const value = item[fieldName];
				if (value === undefined || value === null || value === '') return '';

				const question = questions.find((q) => q.fieldName === fieldName);
				if (!question) return '';

				// Matches ManageListQuestion's own #formatItemAnswers: the display-name
				// lookup for radios lives in formatAnswerForSummary, not formatAnswer.
				return question
					.formatAnswerForSummary('', mockJourney, value)
					.map((a) => a.value)
					.filter((v): v is string => typeof v === 'string')
					.join('');
			}
		};
	}
}

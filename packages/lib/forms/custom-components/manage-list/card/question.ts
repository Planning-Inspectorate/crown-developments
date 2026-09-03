import TableManageListQuestion from '../table/question.ts';
import type { CommonQuestionParams, Journey, Question, QuestionViewModel } from '@planning-inspectorate/dynamic-forms';
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
		/** Orders the rendered cards. The saved answers array is left untouched. */
		sortItems?: (a: Record<string, unknown>, b: Record<string, unknown>) => number;
	};

interface CardViewData {
	question: string;
	fieldName: string;
	pageTitle: string;
	value: Record<string, unknown>[];
	firstQuestionUrl?: string;
	cards?: { id: string; title: string; rows: { label: string; value: string }[] }[];
}

/**
 * A manage list rendered as one summary card per item, with named rows inside.
 */
export default class CardManageListQuestion extends TableManageListQuestion {
	cardTitle?: (item: Record<string, unknown>, params: CardFormatContext) => string;
	rows: CardRow[];
	sortItems?: (a: Record<string, unknown>, b: Record<string, unknown>) => number;

	constructor(params: CardManageListQuestionParams) {
		super(params);
		this.cardTitle = params.cardTitle;
		this.rows = params.rows ?? [];
		this.sortItems = params.sortItems;
		this.viewFolder = 'custom-components/manage-list/card';
	}

	override addCustomDataToViewModel(viewModel: QuestionViewModel<CardViewData>): void {
		super.addCustomDataToViewModel(viewModel);

		const question = viewModel.question;
		const items = question.value ?? [];
		const ordered = this.sortItems ? items.slice().sort(this.sortItems) : items;

		question.cards = ordered.map((item, index) => ({
			id: typeof item.id === 'string' ? item.id : '',
			title: this.cardTitle
				? this.cardTitle(item, this.formatContext(item))
				: `${this.viewData?.titleSingular ?? 'Item'} ${index + 1}`,
			rows: this.buildRows(item)
		}));
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
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: unknown) {
		const items = Array.isArray(answer) ? answer : [];

		return [
			{
				key: this.title ?? this.question,
				// The tab shows a fixed string rather than listing entries; the totals
				// beside it are derived separately
				value: items.length ? 'See details' : this.notStartedText || 'Not started',
				action: this.getAction(sectionSegment, journey, answer) as never
			}
		];
	}

	private buildRows(item: Record<string, unknown>): { label: string; value: string }[] {
		if (this.rows.length === 0) {
			// No rows configured - fall back to one per sub-question.
			return this.formatItemAnswers(item).map((a) => ({ label: a.question ?? '', value: a.answer || '-' }));
		}

		const context = this.formatContext(item);

		return this.rows.map((row) => {
			if (row.format) {
				return { label: row.label, value: row.format(item, context) || '-' };
			}

			if (row.fieldName === undefined) {
				return { label: row.label, value: '-' };
			}

			return { label: row.label, value: context.getFormatted(row.fieldName) || '-' };
		});
	}

	private formatContext(item: Record<string, unknown>): CardFormatContext {
		// section is typed `any` upstream, so we cast once here rather than at each use
		const questions: Question[] = this.section?.questions ?? [];
		const journey = this.buildMockJourney(item);

		/** A card row can only show a primitive - anything else has no display form. */
		const asText = (value: unknown): string =>
			typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';

		return {
			getFormatted: (fieldName) => {
				const value = item[fieldName];

				// An unanswered field returns '' so callers can filter it out - asking the
				// sub-question would give us its notStartedText instead.
				if (value === undefined || value === null || value === '') {
					return '';
				}

				const question = questions.find((q) => q.fieldName === fieldName);

				if (!question) {
					return asText(value);
				}

				const [answer] = question.formatAnswerForSummary('', journey, value) ?? [];

				return answer?.value == null ? asText(value) : asText(answer.value);
			}
		};
	}
}

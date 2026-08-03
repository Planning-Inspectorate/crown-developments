import type { Journey } from '@planning-inspectorate/dynamic-forms';

export interface TableHeadCell {
	text?: string;
	html?: string;
	format?: string;
	classes?: string;
	colspan?: number;
	rowspan?: number;
	attributes?: Record<string, unknown>;
}

export interface TableRowCell {
	text?: string;
	html?: string;
	format?: string;
	classes?: string;
	colspan?: number;
	rowspan?: number;
	attributes?: Record<string, unknown>;
}

export interface TableManageListQuestionParameters {
	titleSingular?: string;
	showManageListQuestions?: boolean;
	showAnswersInSummary?: boolean;
	/** Number of items shown in the tab summary before the "Show more" toggle */
	summaryLimit?: number;
	hideRemoveOnLastItem?: boolean;
	/** Singular noun used in the empty state, e.g. "waste type" */
	emptyName?: string;
	/** Plural form, where adding "s" is not correct */
	emptyNamePlural?: string;
	hideCancel?: boolean;
	hideBackLink?: boolean;
	/** Hide save/cancel until at least one item exists */
	hideButtonsEmpty?: boolean;
	/** Shown above the table when it has rows */
	warningText?: string;
	confirmRemoveButtonText?: string;
	removalPrompt?: string;
}

export interface PreppedQuestion {
	value: Record<string, unknown>;
	question: string;
	fieldName: string;
	pageTitle: string;
	description?: string;
	html?: string;
	firstQuestionUrl?: string;
	shouldDisplay?: (params: { answers: Record<string, unknown> }) => boolean;
	formatAnswerForSummary: (
		sectionSegment: string,
		journey: Journey,
		answer: unknown
	) => Array<{ key: string; value: string; action?: unknown }>;
	tableHead?: TableHeadCell[];
	tableRows?: TableRowCell[][];
}

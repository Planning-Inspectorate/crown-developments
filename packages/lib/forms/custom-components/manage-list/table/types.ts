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
	/** Show 'add another' as a link with this text, instead of the 'Add details' button */
	addAnotherLinkText?: string;
	/** Remove an item straight away, by posting to the remove URL, instead of going to a confirmation page */
	removeWithoutConfirmation?: boolean;
	/** Hide the add button or link once there are this many items */
	maximumAnswers?: number;
	/**
	 * Lines describing an item on its 'Remove' confirmation page, in place of
	 * the sub-questions' summaries. Returned as HTML, so escape any user input.
	 */
	removalSummary?: (item: Record<string, unknown>) => string[];
	/** Shown in place of the table when it has no rows */
	emptyListText?: string;
	/**
	 * The buttons on an empty list, as for the summary list manage list:
	 * 'force' shows only Add, 'prominent' shows Add and Save.
	 * hideButtonsEmpty, if set, takes priority.
	 */
	emptyStateAddStyle?: 'force' | 'prominent';
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

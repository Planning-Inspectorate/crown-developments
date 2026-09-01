import type { OptionsQuestionParameters } from '@planning-inspectorate/dynamic-forms';
import { NumberEntryQuestion } from '@planning-inspectorate/dynamic-forms';
import { escapeHtml } from '../../../util/string.ts';

export type CustomNumberInputQuestionProps = OptionsQuestionParameters & {
	/** Prefix for the summary value, e.g. "Capacity". Defaults to the selected option's text. */
	summaryLabel?: string;
	/** Suffix appended to the value, keyed by option value, e.g. { litres: 'l' } */
	summarySuffix?: Record<string, string>;
	/** Wraps the summary value in <strong>, e.g. where it heads a manage-list item */
	boldSummaryValue?: boolean;
};

type SummaryAction = {
	href: string;
	text: string;
	visuallyHiddenText: string;
};

/**
 * A number question with additional formatting options for multi-field-inputs.
 */
export default class CustomNumberInputQuestion extends NumberEntryQuestion {
	summaryLabel?: string;
	summarySuffixes?: string | Record<string, string>;
	boldSummaryValue: boolean;
	plainFormatting = false;

	constructor({ summaryLabel, summarySuffix, boldSummaryValue, ...params }: CustomNumberInputQuestionProps) {
		super(params);
		this.summaryLabel = summaryLabel;
		this.summarySuffixes = summarySuffix;
		this.boldSummaryValue = boldSummaryValue ?? false;
	}

	/**
	 * The answers key holding the revealed value for a given option.
	 */
	conditionalAnswerKey(conditionalFieldName: string): string {
		return `${this.fieldName}_${conditionalFieldName}`;
	}

	override formatAnswerForSummary(
		sectionSegment: Parameters<NumberEntryQuestion['formatAnswerForSummary']>[0],
		journey: Parameters<NumberEntryQuestion['formatAnswerForSummary']>[1],
		answer: Parameters<NumberEntryQuestion['formatAnswerForSummary']>[2]
	): ReturnType<NumberEntryQuestion['formatAnswerForSummary']> {
		const rawValue =
			typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean' ? String(answer) : null;

		let displayValue = '-';

		if (rawValue !== null && rawValue !== '') {
			const suffix = typeof this.summarySuffixes === 'string' ? this.summarySuffixes : '';
			const label = this.plainFormatting ? null : this.summaryLabel;

			displayValue = label ? `${label}: ${rawValue}${suffix}` : `${rawValue}${suffix}`;
		}

		if (this.boldSummaryValue && !this.plainFormatting && displayValue !== '-') {
			displayValue = `<strong>${escapeHtml(displayValue)}</strong>`;
		}

		const action =
			'getAction' in this && typeof (this as Record<string, unknown>).getAction === 'function'
				? (this as unknown as { getAction: (...args: unknown[]) => SummaryAction }).getAction(
						sectionSegment,
						journey,
						answer
					)
				: (undefined as unknown as SummaryAction);

		return [
			{
				key: `${this.title}`,
				value: displayValue,
				action
			}
		];
	}
}

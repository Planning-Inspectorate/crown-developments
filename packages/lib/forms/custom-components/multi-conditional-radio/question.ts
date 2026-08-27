import { RadioQuestion } from '@planning-inspectorate/dynamic-forms';
import type { Question, OptionsQuestionParameters } from '@planning-inspectorate/dynamic-forms';
import { escapeHtml } from '../../../util/string.ts';
import { roundForDisplay } from '../../../util/numbers.ts';

export type MultiConditionalRadioQuestionProps = OptionsQuestionParameters & {
	/** Prefix for the summary value, e.g. "Capacity". Defaults to the selected option's text. */
	summaryLabel?: string;
	/** Suffix appended to the value, keyed by option value, e.g. { litres: 'l' } */
	summarySuffixes?: Record<string, string>;
	/** Wraps the summary value in <strong>, e.g. where it heads a manage-list item */
	boldSummaryValue?: boolean;
	/** Rounds the revealed value to 2dp for display. Numeric conditionals only. */
	roundDecimals?: boolean;
};

/**
 * A radio question where every option can reveal its own conditional input.
 *
 * Unlike ConditionalRadioQuestion, which supports a single trigger value, each
 * option here carries its own `conditional.fieldName`. The revealed value is
 * stored under `${fieldName}_${conditional.fieldName}` so the answers stay flat.
 */
export default class MultiConditionalRadioQuestion extends RadioQuestion {
	summaryLabel?: string;
	summarySuffixes?: Record<string, string>;
	boldSummaryValue: boolean;
	roundDecimals: boolean;
	/**
	 * Set by the caller while building table cells, where the column header
	 * already names the value and emphasis would be arbitrary.
	 */
	plainFormatting = false;

	constructor({
		summaryLabel,
		summarySuffixes,
		boldSummaryValue,
		roundDecimals,
		...params
	}: MultiConditionalRadioQuestionProps) {
		super(params);
		this.summaryLabel = summaryLabel;
		this.summarySuffixes = summarySuffixes;
		this.boldSummaryValue = boldSummaryValue ?? false;
		this.roundDecimals = roundDecimals ?? false;
	}

	/**
	 * The answers key holding the revealed value for a given option.
	 */
	conditionalAnswerKey(conditionalFieldName: string): string {
		return `${this.fieldName}_${conditionalFieldName}`;
	}

	formatAnswerForSummary(
		...args: Parameters<Question['formatAnswerForSummary']>
	): ReturnType<Question['formatAnswerForSummary']> {
		const [sectionSegment, journey, answer] = args;

		const selectedOption = this.options.find((opt) => opt.value === answer);
		let displayValue = selectedOption ? selectedOption.text : '-';

		const conditionalFieldName = selectedOption?.conditional?.fieldName;

		if (conditionalFieldName) {
			const conditionalValue = journey.response.answers[this.conditionalAnswerKey(conditionalFieldName)] as
				string | undefined;

			if (conditionalValue) {
				const displayed = this.roundDecimals ? roundForDisplay(conditionalValue) : conditionalValue;
				const suffix = this.summarySuffixes?.[answer as string] ?? '';
				const label = this.plainFormatting ? null : (this.summaryLabel ?? selectedOption.text);

				displayValue = label ? `${label}: ${displayed}${suffix}` : `${displayed}${suffix}`;
			}
		}

		if (this.boldSummaryValue && !this.plainFormatting) {
			// The manage-list templates render values with `| safe`, so this survives.
			displayValue = `<strong>${escapeHtml(displayValue)}</strong>`;
		}

		return [
			{
				key: `${this.title}`,
				value: displayValue,
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}
}

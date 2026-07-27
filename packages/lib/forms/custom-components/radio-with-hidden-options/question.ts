import { RadioQuestion, type Option, OptionsQuestion, type Journey } from '@planning-inspectorate/dynamic-forms';
import type { CrownCommonQuestionProps } from '../index.ts';

export type HiddenRadioQuestionProps = CrownCommonQuestionProps & {
	options: Option[];
	viewFolder: string | undefined;
	label: string | undefined;
	legend: string | undefined;
	hiddenOptions: Option[];
};

/**
 * Question that acts identical to a normal radio, except that it receives
 * a second array `hiddenOptions` that are used for lookup and display on
 * summary pages but not on the actual question page.
 *
 * Example: LBC case type needs to be displayed on the case details page
 * if the user has selected that type, however we do not want it to be
 * selectable inside of the question, as users changing from a case type
 * to an LBC type would cause issues. Therefore, LBC case type would be
 * passed as a hidden option but not a real option.
 */
export default class HiddenRadioQuestion extends RadioQuestion {
	hiddenOptions: Option[];

	constructor(params: HiddenRadioQuestionProps) {
		const superParams = {
			...params,
			viewFolder: !params.viewFolder ? 'radio' : params.viewFolder
		};
		super(superParams);
		this.hiddenOptions = params.hiddenOptions;
	}

	/**
	 * Similar functionality to parent function, but importantly runs new `getOptionByValue` which combines this.options
	 * with this.legacyOptions to allow the value to be presented on the summary but not on the select page.
	 *
	 * "super"s past the parent straight to the grandparent to avoid this getting overwritten
	 */
	formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: Record<string, unknown> | string) {
		if (typeof answer === 'object' && typeof answer?.conditional === 'string') {
			const selectedOption = this.getOptionByValue(answer.value as string);

			const conditionalAnswerText = selectedOption?.conditional?.label
				? `${selectedOption.conditional.label} ${answer.conditional}`
				: answer.conditional;

			const formattedAnswer = [selectedOption?.text, conditionalAnswerText].join('\n');

			return OptionsQuestion.prototype.formatAnswerForSummary.call(
				this,
				sectionSegment,
				journey,
				formattedAnswer,
				false
			);
		} else if (answer && typeof answer === 'string') {
			const selectedOption = this.getOptionByValue(answer);
			const selectedText = selectedOption?.text || '';
			return OptionsQuestion.prototype.formatAnswerForSummary.call(this, sectionSegment, journey, selectedText, false);
		}
		return super.formatAnswerForSummary(sectionSegment, journey, answer);
	}

	/**
	 * Combines real values with legacy ones to be viewable.
	 */
	getOptionByValue(value: string) {
		const allOptions = [...this.options, ...this.hiddenOptions];
		return allOptions.find((option) => option.value === value);
	}
}

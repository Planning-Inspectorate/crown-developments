import type { SelectableOption } from '@planning-inspectorate/dynamic-forms';
import { RadioQuestion } from '@planning-inspectorate/dynamic-forms';
import type { CrownCommonQuestionProps } from '../index.ts';
import escape from 'escape-html';

export type HiddenRadioQuestionProps = CrownCommonQuestionProps & {
	options: SelectableOption[];
	viewFolder: string | undefined;
	label: string | undefined;
	legend: string | undefined;
	hiddenOptions: SelectableOption[];
};

/**
 * Question that acts identical to a normal radio, except that it receives
 * a second array `hiddenOptions` that are used for lookup and display on
 * summary pages but not on the actual question page.
 *
 * Example: LBC case type needs to be displayed on the case details page
 * if the user has selected that type, however we do not want it to be
 * selectable inside the question, as users changing from a case type
 * to an LBC type would cause issues. Therefore, LBC case type would be
 * passed as a hidden option but not a real option.
 */
export default class HiddenRadioQuestion extends RadioQuestion {
	hiddenOptions: SelectableOption[];

	constructor(params: HiddenRadioQuestionProps) {
		const superParams = {
			...params,
			viewFolder: !params.viewFolder ? 'radio' : params.viewFolder
		};
		super(superParams);
		this.hiddenOptions = params.hiddenOptions;
		// TODO: PEAS-473 Review this, as it is a bit of a hack to maintain compatibility with legacy code.
		//  The base class sets this.notStartedText to "Not started" by default,
		//  but legacy code expects it to be an empty string. This override ensures that the behavior remains consistent with legacy expectations.
		this.notStartedText = '';
	}

	/**
	 * Similar functionality to parent function, but importantly runs new `getOptionByValue` which combines this.options
	 * with this.legacyOptions to allow the value to be presented on the summary but not on the select page.
	 */
	override formatAnswer(answer: string | Record<string, unknown>) {
		if (answer === null || answer === undefined || answer === '') {
			return this.notStartedText;
		}

		// Plain string answer: rewrite it to the option's text, then defer to base.
		if (typeof answer !== 'object') {
			const option = this.getOptionByValue(answer);
			return super.formatAnswer(option?.text ?? '');
		}
		const answerObj = answer as { value: string; conditional?: Record<string, string> };
		const option = this.getOptionByValue(answerObj.value);
		const optionText = escape(option ? option.text : answerObj.value);

		const conditionalValue = answerObj.conditional?.[answerObj.value];
		if (conditionalValue) {
			const label = option?.conditional?.label ? `${escape(option.conditional.label)} ` : '';
			return `${optionText}<br>${label}${escape(conditionalValue)}`;
		}
		return optionText;
	}

	/**
	 * Combines real values with legacy ones to be viewable.
	 */
	getOptionByValue(value: string): SelectableOption | undefined {
		return [...this.options, ...this.hiddenOptions].find((option) => option.value === value);
	}
}

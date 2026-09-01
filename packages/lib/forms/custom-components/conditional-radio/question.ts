import type { OptionsQuestionParameters, Question } from '@planning-inspectorate/dynamic-forms';
import { RadioQuestion } from '@planning-inspectorate/dynamic-forms';

export type ConditionalRadioQuestionProps = OptionsQuestionParameters & {
	conditionalTriggerValue: string;
	conditionalDbFieldName: string;
};

/**
 * Generic class that allows for the creation of conditional radio questions.
 */
export default class ConditionalRadioQuestion extends RadioQuestion {
	conditionalTriggerValue: string;
	conditionalDbFieldName: string;

	constructor({ conditionalTriggerValue, conditionalDbFieldName, ...params }: ConditionalRadioQuestionProps) {
		super(params);
		this.conditionalTriggerValue = conditionalTriggerValue;
		this.conditionalDbFieldName = conditionalDbFieldName;
	}

	/**
	 * Returns the formatted answers values to be used to build task list elements
	 */
	formatAnswerForSummary(
		...args: Parameters<Question['formatAnswerForSummary']>
	): ReturnType<Question['formatAnswerForSummary']> {
		const [sectionSegment, journey, answer] = args;
		const conditionalValue = journey.response.answers[`${this.fieldName}_${this.conditionalDbFieldName}`] as
			string | undefined;

		const selectedOption = this.options.find((opt) => opt.value === answer);
		const baseText = selectedOption ? selectedOption.text : '-';

		// Format as "Selected Option: Custom Text" if applicable
		let displayValue = baseText;
		if (answer === this.conditionalTriggerValue && conditionalValue) {
			displayValue = `${baseText}: ${conditionalValue}`;
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

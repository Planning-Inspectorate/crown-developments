import OptionsQuestion from '../../questions/options-question.js';
import questionUtils from '../utils/question-utils.js';

const defaultOptionJoinString = ',';

/**
 * @typedef {import('../../journey/journey.js').Journey} Journey
 */

/**
 * @typedef ConditionalAnswerObject
 * @type {object}
 * @property {string} value the checkbox answer
 * @property {string} conditional the conditional text input
 */

export default class CheckboxQuestion extends OptionsQuestion {
	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} [params.url]
	 * @param {string} [params.pageTitle]
	 * @param {string} [params.description]
	 * @param {Array.<import('../../questions/options-question.js').Option>} params.options
	 * @param {Array.<import('../../questions/question.js').BaseValidator>} [params.validators]
	 */
	constructor({ title, question, fieldName, url, pageTitle, description, options, validators }) {
		super({
			title,
			question,
			viewFolder: 'checkbox',
			fieldName,
			url,
			pageTitle,
			description,
			options,
			validators
		});

		this.optionJoinString = defaultOptionJoinString;
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @param {string | ConditionalAnswerObject } answer will be a single value string, a comma-separated string representing multiple values (one of which may be a conditional) or a single ConditionalAnswerObject
	 * @param {Journey} journey
	 * @param {String} sectionSegment
	 * @returns {Array.<Object>}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		if (!answer) {
			return super.formatAnswerForSummary(sectionSegment, journey, answer, false);
		}

		// answer is single ConditionalAnswerObject
		if (answer?.conditional) {
			const selectedOption = this.options.find((option) => option.value === answer.value);

			const conditionalAnswerText = selectedOption.conditional?.label
				? `${selectedOption.conditional.label} ${answer.conditional}`
				: answer.conditional;

			const formattedConditionalText = [selectedOption.text, conditionalAnswerText].join('\n');

			return super.formatAnswerForSummary(sectionSegment, journey, formattedConditionalText, false);
		}

		// answer is a string
		const answerArray = answer.split(this.optionJoinString);

		const formattedAnswer = this.options
			.filter((option) => answerArray.includes(option.value))
			.map((option) => {
				if (option.conditional) {
					const conditionalAnswer =
						journey.response.answers[
							questionUtils.getConditionalFieldName(this.fieldName, option.conditional.fieldName)
						];
					return [option.text, conditionalAnswer].join('\n');
				}

				return option.text;
			})
			.join('\n');

		return super.formatAnswerForSummary(sectionSegment, journey, formattedAnswer, false);
	}
}

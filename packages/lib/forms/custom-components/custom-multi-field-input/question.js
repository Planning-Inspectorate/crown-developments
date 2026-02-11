import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import escape from 'escape-html';
import { nl2br } from '@planning-inspectorate/dynamic-forms/src/lib/utils.js';

/**
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').QuestionViewModel} QuestionViewModel
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} Journey
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-types').QuestionParameters} QuestionParameters
 */

/**
 * @typedef {Object} Affix
 * @property {string} text
 * @property {string} [classes] optional property, used to add classes to the suffix/prefix
 */

/**
 * @typedef {Object} BaseField
 * @property {string} fieldName
 * @property {string} [formatJoinString] optional property, used by formatAnswerForSummary (e.g. task list display), effective default to line break
 * @property {string} [formatPrefix] optional property, used by formatAnswerForSummary (e.g. task list display), to prefix answer
 * @property {function} [formatTextFunction] optional property, used to format the answer for display and value in question
 */

/**
 * @typedef {BaseField & {
 *   type: 'single-line-input',
 *   label: string,
 *   attributes?: Record<string, string>,
 * 	 autocomplete?: string,
 *   suffix?: Affix,
 *   prefix?: Affix
 * }} InputField
 */

/**
 * @typedef {BaseField & {
 *   type: 'radio',
 *   label?: string,
 * 	 legend?: string,
 *   options: Array<{ text: string, value: string, attributes?: Record<string, string> }>
 * }} RadioField
 */

/**
 * @typedef {BaseField & {
 *   type: 'hidden',
 *   value: string
 * }} HiddenField
 */

/**
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.d.ts').CommonQuestionProps} CommonQuestionProps
 * @typedef {Omit<CommonQuestionProps, 'type'> & {
 *   type: 'custom-multi-field-input';
 *   label?: string;
 *   inputAttributes?: Record<string, string>;
 *   inputFields: (InputField|RadioField|HiddenField)[];
 * }} CustomMultiFieldInputQuestionProps
 */

/** @type {'hidden'} */
export const HIDDEN_TYPE = 'hidden';

/**
 * @class
 */
export default class CustomMultiFieldInputQuestion extends Question {
	/** @type {Record<string, string>} */
	inputAttributes;
	/** @type {(InputField|RadioField|HiddenField)[]} */
	inputFields;

	/**
	 * @param {Object} options
	 * @param {QuestionParameters} options.params
	 * @param {string|undefined} [options.label] if defined this show as a label for the input and the question will just be a standard h1
	 * @param {Record<string, string>} [options.inputAttributes] html attributes to add to the input
	 * @param {(InputField|RadioField|HiddenField)[]} options.inputFields input fields
	 */
	constructor({ label, inputAttributes = {}, inputFields, ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/custom-multi-field-input'
		});
		this.label = label;
		this.inputAttributes = inputAttributes;

		if (!inputFields) {
			throw new Error('inputFields are mandatory');
		}

		this.inputFields = inputFields;
	}

	/**
	 * Process answers for the view model
	 * @param {Record<string, string>} answers
	 * @returns
	 */
	answerForViewModel(answers) {
		return this.inputFields.map((inputField) => {
			if (inputField.type === 'hidden') {
				return inputField;
			}

			if (inputField.type === 'radio') {
				return {
					...inputField,
					options: inputField.options.map((option) => ({
						...option,
						checked: option.value === answers[inputField.fieldName]
					}))
				};
			}

			return {
				...inputField,
				value: this.#formatValue(answers[inputField.fieldName], inputField.formatTextFunction)
			};
		});
	}

	/**
	 * @param {QuestionViewModel} viewModel
	 */
	addCustomDataToViewModel(viewModel) {
		viewModel.question.label = this.label;
		viewModel.question.attributes = this.inputAttributes;
	}

	/**
	 * Get the data to save from the request, returns an object of answers
	 * @param {import('express').Request} req
	 * @param {JourneyResponse} journeyResponse - current journey response, modified with the new answers
	 * @returns {Promise<{ answers: Record<string, unknown> }>}
	 */ //eslint-disable-next-line no-unused-vars -- journeyResponse kept for other questions to use
	async getDataToSave(req, journeyResponse) {
		/** @type {Record<string, unknown>} */
		const answers = {};

		for (const inputField of this.inputFields) {
			let value = req.body[inputField.fieldName];
			if (typeof value === 'string') {
				value = value.trim();
			}
			answers[inputField.fieldName] = value;
		}

		return { answers };
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @param {Journey} journey
	 * @param {String} sectionSegment
	 * @returns {Array<{
	 *   key: string;
	 *   value: string | Object;
	 *   action: {
	 *     href: string;
	 *     text: string;
	 *     visuallyHiddenText: string;
	 *   };
	 * }>}
	 */
	formatAnswerForSummary(sectionSegment, journey) {
		const summaryDetails = this.inputFields.reduce((acc, field) => {
			const answer = this.#formatValue(
				String(journey.response.answers[field.fieldName] || ''),
				field.formatTextFunction
			);
			return answer ? acc + (field.formatPrefix || '') + answer + (field.formatJoinString || '\n') : acc;
		}, '');

		const formattedAnswer = this.#allQuestionsUnanswered(journey) ? this.notStartedText : summaryDetails || '';

		return [
			{
				key: `${this.title}`,
				value: this.isInManageListSection
					? // Avoid double <br> at the end of answer in manage list section
						escape(formattedAnswer).replace(/\n(?!$)/g, '<br>')
					: nl2br(escape(formattedAnswer)),
				action: this.getAction(sectionSegment, journey, summaryDetails)
			}
		];
	}

	/**
	 * checks whether any answers have been provided for input field questions
	 * @param {Journey} journey
	 * @returns {boolean}
	 */
	#allQuestionsUnanswered(journey) {
		return this.inputFields.every((field) => journey.response.answers[field.fieldName] === undefined);
	}

	/**
	 * returns formatted value/answer if formatting is provided (defaults to value provided)
	 * @param {string} valueToFormat
	 * @param {function} [formatTextFunction]
	 * @returns {string}
	 *
	 */
	#formatValue(valueToFormat, formatTextFunction) {
		if (typeof formatTextFunction === 'function' && valueToFormat) {
			return formatTextFunction(valueToFormat);
		}

		return valueToFormat;
	}
}

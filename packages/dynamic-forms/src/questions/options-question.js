import nunjucks from 'nunjucks';
import { Question } from './question.js';
import ValidOptionValidator from '../validator/valid-option-validator.js';
import { getConditionalFieldName } from '../components/utils/question-utils.js';

const defaultOptionJoinString = ',';

/**
 * @typedef {import('./question').QuestionViewModel} QuestionViewModel
 * @typedef {import('../journey/journey.js').Journey} Journey
 * @typedef {import('../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../section.js').Section} Section
 */

/**
 * @typedef {{
 *   text: string;
 *   value: string;
 *     hint?: object;
 *   checked?: boolean | undefined;
 *   attributes?: Record<string, string>;
 *   behaviour?: 'exclusive';
 *   conditional?: {
 *     question: string;
 *     type: string;
 *     fieldName: string;
 *         inputClasses?: string;
 *         html?: string;
 *     value?: unknown;
 *         label?: string;
 *         hint?: string
 *   };
 *     conditionalText?: {
 *       html: string;
 *   }
 *}} Option
 */

/**
 * @typedef {QuestionViewModel & { question: { options: Option[] } }} OptionsViewModel
 */

export default class OptionsQuestion extends Question {
	/** @type {Array<Option>} */
	options;

	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.viewFolder
	 * @param {string} params.fieldName
	 * @param {string} [params.url]
	 * @param {string} [params.hint]
	 * @param {string} [params.pageTitle]
	 * @param {string} [params.description]
	 * @param {Array<Option>} params.options
	 * @param {Array<import('./question').BaseValidator>} [params.validators]
	 * @param {boolean} [params.editable]
	 */
	constructor({
		title,
		question,
		viewFolder,
		fieldName,
		url,
		hint,
		pageTitle,
		description,
		options,
		validators,
		editable
	}) {
		// add default valid options validator to all options questions
		let optionsValidators = [new ValidOptionValidator()];
		if (validators && Array.isArray(validators)) {
			optionsValidators = validators.concat(optionsValidators);
		}

		super({
			title,
			question,
			viewFolder,
			fieldName,
			url,
			hint,
			pageTitle,
			description,
			validators: optionsValidators,
			editable
		});
		this.hint = hint;
		this.options = options;
		this.optionJoinString = defaultOptionJoinString;
	}

	/**
	 * gets the view model for this question
	 * @param {Section} section - the current section
	 * @param {Journey} journey - the journey we are in
	 * @param {Record<string, unknown>} [customViewData] additional data to send to view
	 * @param {Record<string, unknown>} [payload]
	 * @returns {QuestionViewModel}
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		const answer = payload ? payload[this.fieldName] : journey.response.answers[this.fieldName] || '';

		const viewModel = super.prepQuestionForRendering(section, journey, customViewData, payload);

		viewModel.question.options = [];

		for (const option of this.options) {
			let optionData = { ...option };
			if (optionData.value !== undefined) {
				const selected = (',' + answer + ',').includes(',' + optionData.value + ',');
				// support checkboxes/radios
				optionData.checked = selected;
				// support selects
				optionData.selected = selected;
				if (!optionData.attributes) {
					optionData.attributes = { 'data-cy': 'answer-' + optionData.value };
				}
			}

			// handle conditional (dependant) fields & set their answers
			if (optionData.conditional !== undefined) {
				let conditionalField = { ...optionData.conditional };

				conditionalField.fieldName = getConditionalFieldName(this.fieldName, conditionalField.fieldName);
				conditionalField.value = payload
					? payload[conditionalField.fieldName]
					: journey.response.answers[conditionalField.fieldName] || '';

				optionData.conditional = {
					html: nunjucks.render(`./components/conditional/${conditionalField.type}.njk`, {
						payload,
						...conditionalField,
						...customViewData
					})
				};
			}

			// handles conditional text only - if using conditional question the use conditional field
			if (optionData.conditionalText !== undefined) {
				optionData.conditional = optionData.conditionalText;
			}

			viewModel.question.options.push(optionData);
		}

		return viewModel;
	}

	/**
	 * returns the data to send to the DB
	 * side effect: modifies journeyResponse with the new answers
	 * @param {import('express').Request} req
	 * @param {JourneyResponse} journeyResponse - current journey response, modified with the new answers
	 * @returns {Promise<{ answers: Record<string, unknown> }>}
	 */
	async getDataToSave(req, journeyResponse) {
		/**
		 * @type {{ answers: Record<string, unknown> }}
		 */
		let responseToSave = { answers: {} };

		const fields = Array.isArray(req.body[this.fieldName]) ? req.body[this.fieldName] : [req.body[this.fieldName]];
		const fieldValues = fields.map((x) => x.trim());

		const selectedOptions = this.options.filter(({ value }) => {
			return fieldValues.includes(value);
		});

		if (!selectedOptions.length)
			throw new Error(`User submitted option(s) did not correlate with valid answers to ${this.fieldName} question`);

		responseToSave.answers[this.fieldName] = fieldValues.join(this.optionJoinString);
		journeyResponse.answers[this.fieldName] = fieldValues;

		this.options.forEach((option) => {
			if (!option.conditional) return;
			const key = getConditionalFieldName(this.fieldName, option.conditional.fieldName);
			const optionIsSelectedOption = selectedOptions.some(
				(selectedOption) => option.text === selectedOption.text && option.value === selectedOption.value
			);

			const value = optionIsSelectedOption ? req.body[key]?.trim() : null;
			responseToSave.answers[key] = value;
			journeyResponse.answers[key] = value;
		});

		return responseToSave;
	}
}

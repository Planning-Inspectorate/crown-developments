import { Question } from '../../questions/question.js';
import escape from 'escape-html';
import { nl2br } from '../../lib/utils.js';

/**
 * @typedef {import('../../questions/question.js').QuestionViewModel} QuestionViewModel
 * @typedef {import('../../journey/journey.js').Journey} Journey
 * @typedef {import('../../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../../section').Section} Section
 * @typedef {import('../../validator/base-validator')} BaseValidator
 */

/**
 * @typedef {Object} InputField
 * @property {string} fieldName
 * @property {string} label
 * @property {string} [formatJoinString] optional property, used by formatAnswerForSummary (eg task list display), effective default to line break
 * @property {string} [formatPrefix] optional property, used by formatAnswerForSummary (eg task list display), to prefix answer
 * @property {Record<string, string>} [attributes] optional property, used to add html attributes to the field
 */

/**
 * @class
 */
export default class MultiFieldInputQuestion extends Question {
	/** @type {Record<string, string>} */
	inputAttributes;

	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} [params.description]
	 * @param {string} [params.url]
	 * @param {string} [params.html]
	 * @param {string} [params.hint]
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 * @param {Array.<BaseValidator>} [params.validators]
	 * @param {Record<string, string>} [params.inputAttributes] html attributes to add to the input
	 * @param {InputField[]} params.inputFields input fields
	 * @param {'contactDetails' | 'standard' | null} [params.formatType] optional type field used for formatting for task list
	 * @param {boolean} [params.editable]
	 * @param {Object<string, any>} [params.viewData]
	 */
	constructor({
		title,
		question,
		fieldName,
		url,
		hint,
		validators,
		html,
		label,
		inputAttributes = {},
		inputFields,
		editable,
		viewData
	}) {
		super({
			title,
			viewFolder: 'multi-field-input',
			fieldName,
			url,
			question,
			validators,
			hint,
			html,
			editable,
			viewData
		});
		this.label = label;
		this.inputAttributes = inputAttributes;

		if (inputFields) {
			this.inputFields = inputFields;
		} else {
			throw new Error('inputFields are mandatory');
		}
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);

		const inputFields = this.inputFields.map((inputField) => {
			return payload
				? { ...inputField, value: payload[inputField.fieldName] }
				: { ...inputField, value: journey.response.answers[inputField.fieldName] };
		});

		viewModel.question.inputFields = inputFields;
		viewModel.question.label = this.label;
		viewModel.question.attributes = this.inputAttributes;
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

		for (const inputField of this.inputFields) {
			responseToSave.answers[inputField.fieldName] = req.body[inputField.fieldName]?.trim();
			journeyResponse.answers[inputField.fieldName] = responseToSave.answers[inputField.fieldName];
		}

		return responseToSave;
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
			const answer = journey.response.answers[field.fieldName];
			return answer ? acc + (field.formatPrefix || '') + answer + (field.formatJoinString || '\n') : acc;
		}, '');

		const formattedAnswer = this.#allQuestionsUnanswered(journey) ? this.notStartedText : summaryDetails || '';

		return [
			{
				key: `${this.title}`,
				value: nl2br(escape(formattedAnswer)),
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
}

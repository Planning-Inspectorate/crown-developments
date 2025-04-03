import { Question } from '../../questions/question.js';

import escape from 'escape-html';
import { Address } from '../../lib/address.js';
import { nl2br } from '../../lib/utils.js';
import AddressValidator from '../../validator/address-validator.js';

/**
 * @typedef {import('../../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../../journey/journey.js').Journey} Journey
 * @typedef {import('../../section.js').Section} Section
 * @typedef {import('../../questions/question.js').QuestionViewModel} QuestionViewModel
 * @typedef {import('appeals-service-api').Api.SubmissionAddress} SubmissionAddress

 */

export default class AddressQuestion extends Question {
	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} [params.url]
	 * @param {string} [params.hint]
	 * @param {string} [params.html]
	 * @param {Array.<import('../../validator/base-validator.js')>} [params.validators]
	 * @param {boolean} [params.editable]
	 * @param {Object<string, any>} [params.viewData]
	 */
	constructor({ title, question, fieldName, validators, url, hint, html, editable, viewData }) {
		super({
			title: title,
			viewFolder: 'address',
			fieldName: fieldName,
			question: question,
			validators: validators,
			hint: hint,
			html: html,
			editable,
			viewData
		});
		this.url = url;

		for (const validator of validators) {
			if (validator instanceof AddressValidator) {
				this.requiredFields = validator.requiredFields;
			}
		}

		this.addressLabels = {
			addressLine1: `Address line 1${this.formatLabelFromRequiredFields('addressLine1')}`,
			addressLine2: `Address line 2${this.formatLabelFromRequiredFields('addressLine2')}`,
			townCity: `Town or city${this.formatLabelFromRequiredFields('townCity')}`,
			county: `County${this.formatLabelFromRequiredFields('county')}`,
			postcode: `Postcode${this.formatLabelFromRequiredFields('postcode')}`
		};
	}

	/**
	 * @param {Section} section
	 * @param {Journey} journey
	 * @param {Record<string, unknown>} customViewData
	 * @returns {QuestionViewModel}
	 */
	prepQuestionForRendering(section, journey, customViewData) {
		const viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		const address = journey.response.answers[this.fieldName] || {};

		// will only ever have 1
		if (address) {
			viewModel.question.value = {
				addressLine1: address.addressLine1 || '',
				addressLine2: address.addressLine2 || '',
				townCity: address.townCity || '',
				county: address.county || '',
				postcode: address.postcode || ''
			};
		}

		viewModel.question.labels = this.addressLabels;

		return viewModel;
	}

	/**
	 * returns the data to send to the DB
	 * side effect: modifies journeyResponse with the new answers
	 * @param {import('express').Request} req
	 * @param {JourneyResponse} journeyResponse
	 * @returns {Promise<{answers: Record<string, unknown>}>}
	 */
	async getDataToSave(req, journeyResponse) {
		const data = {
			addressLine1: req.body[this.fieldName + '_addressLine1'],
			addressLine2: req.body[this.fieldName + '_addressLine2'],
			townCity: req.body[this.fieldName + '_townCity'],
			county: req.body[this.fieldName + '_county'],
			postcode: req.body[this.fieldName + '_postcode']
		};
		const allEmpty = Object.values(data).every((v) => !v);
		let address = null;
		if (!allEmpty) {
			address = new Address(data);
		}
		const answers = {
			[this.fieldName]: address
		};
		journeyResponse.answers[this.fieldName] = address;

		return {
			answers
		};
	}

	/**
	 * @param {Object<string, any>} answer
	 * @returns The formatted address to be presented in the UI
	 */
	format(answer) {
		const addressComponents = [
			answer.addressLine1,
			answer.addressLine2,
			answer.townCity,
			answer.county,
			answer.postcode
		];

		return addressComponents.filter(Boolean).join('\n');
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @type {Question['formatAnswerForSummary']}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		let formattedAnswer = this.notStartedText;

		if (answer) {
			formattedAnswer = nl2br(escape(this.format(answer)));
		} else if (answer === null) {
			formattedAnswer = '';
		}

		return [
			{
				key: `${this.title}`,
				value: formattedAnswer,
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}
	formatLabelFromRequiredFields(fieldName) {
		if (this.requiredFields && this.requiredFields[fieldName]) {
			return '';
		} else {
			return ' (optional)';
		}
	}
}

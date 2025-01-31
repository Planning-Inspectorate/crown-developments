/**
 * @typedef {import('./questions/question').Question} Question
 * @typedef {import('./journey/journey-response').JourneyResponse} JourneyResponse
 */

import RequiredValidator from './validator/required-validator.js';

/**
 * Defines a section for a questionnaire, a set of Questions
 * @class
 */
export class Section {
	/**
	 * @type {string} - the display name of the section shown to user
	 */
	name;

	/**
	 * @type {string} - the unique url segment for the section
	 */
	segment;

	/**
	 * @type {Array<Question>} - questions within the section
	 */
	questions = [];

	/**
	 * @type {boolean} - if a condition has just been added ensure a question is added before the next condition
	 */
	#conditionAdded = false;

	/**
	 * creates an instance of a section
	 * @param {string} name
	 * @param {string} segment
	 */
	constructor(name, segment) {
		this.name = name;
		this.segment = segment;
	}

	/**
	 * Fluent API method for adding questions
	 * @param {any} question
	 * @returns {Section}
	 */
	addQuestion(question) {
		this.questions.push(question);
		this.#conditionAdded = false; // reset condition flag
		return this;
	}

	/**
	 * Fluent API method for attaching conditions to the previously added question
	 * @param {((response: JourneyResponse) => boolean)} shouldIncludeQuestion
	 * @returns {Section}
	 */
	withCondition(shouldIncludeQuestion) {
		if (this.#conditionAdded) {
			// don't allow two conditions in a row
			throw new Error('conditions must follow a question');
		}
		this.#conditionAdded = true; // set condition flag
		const lastQuestionAdded = this.questions.length - 1;
		this.questions[lastQuestionAdded].shouldDisplay = shouldIncludeQuestion;
		return this;
	}

	isFieldMandatory(isQuestionMandatory, requiredFieldErrorMsg) {
		this.#conditionAdded = true;
		const lastQuestionAdded = this.questions.length - 1;
		const validators = this.questions[lastQuestionAdded].validators;

		if (isQuestionMandatory) {
			if (!validators.some((validator) => validator instanceof RequiredValidator)) {
				validators.push(new RequiredValidator(requiredFieldErrorMsg));
			}
		} else {
			this.questions[lastQuestionAdded].validators = validators.filter(
				(validator) => !(validator instanceof RequiredValidator)
			);
		}

		return this;
	}

	/**
	 * checks answers on response to ensure that a answer is provided for each required question in the section
	 * @param {JourneyResponse} journeyResponse
	 * @returns {SectionStatus}
	 */
	getStatus(journeyResponse) {
		let result = SECTION_STATUS.NOT_STARTED;
		let requiredQuestionCount = 0;
		let requiredAnswerCount = 0;
		let answerCount = 0;

		for (let question of this.questions) {
			if (!question.shouldDisplay(journeyResponse)) {
				continue;
			}

			if (question.isRequired()) {
				requiredQuestionCount++;
			}

			if (question.isAnswered(journeyResponse)) {
				answerCount++;
			}

			if (question.isAnswered(journeyResponse) && question.isRequired()) {
				requiredAnswerCount++;
			}
		}

		// any answer given
		if (answerCount > 0) {
			result = SECTION_STATUS.IN_PROGRESS;
		}

		// all required questions complete
		// if no required sections this will never be hit
		if (requiredQuestionCount !== 0 && requiredAnswerCount >= requiredQuestionCount) {
			result = SECTION_STATUS.COMPLETE;
		}

		return result;
	}

	/**
	 * checks answers on response and return true if the status of the section is complete
	 * @param {JourneyResponse} journeyResponse
	 * @returns {boolean}
	 */
	isComplete(journeyResponse) {
		return this.getStatus(journeyResponse) === SECTION_STATUS.COMPLETE;
	}

	//todo: taskList withCondition - i.e. evaluate whether question should be
	//included in taskList (summary list) or not. See also comment in Question class
	//constructor - should only evaluate if on task list view
}

/**
 * @typedef {string} SectionStatus
 */

/**
 * @enum {SectionStatus}
 */
export const SECTION_STATUS = Object.freeze({
	NOT_STARTED: 'Not started',
	IN_PROGRESS: 'In progress',
	COMPLETE: 'Completed'
});

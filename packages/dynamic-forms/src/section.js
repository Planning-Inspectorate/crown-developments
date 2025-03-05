/**
 * @typedef {import('./questions/question').Question} Question
 * @typedef {import('./journey/journey-response').JourneyResponse} JourneyResponse
 * @typedef {((response: JourneyResponse) => boolean)} QuestionCondition
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
	 * A condition to apply to every question in this section
	 * @type {QuestionCondition|null}
	 */
	#sectionCondition = null;

	/**
	 * conditions to apply to a set of questions, until ended is true
	 * @type {Object<string, {ended: boolean, condition: QuestionCondition}>}
	 */
	#multiQuestionConditions = {};

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
	 * Add a condition to all questions in this section
	 *
	 * @param {QuestionCondition} shouldIncludeSection
	 * @returns {Section}
	 */
	withSectionCondition(shouldIncludeSection) {
		if (this.questions.length > 0) {
			throw new Error('section conditions must be added before any questions');
		}
		if (typeof shouldIncludeSection !== 'function') {
			throw new Error('section condition must be a function');
		}
		if (this.#sectionCondition) {
			throw new Error('section condition already set');
		}
		this.#sectionCondition = shouldIncludeSection;
		return this;
	}

	/**
	 * Fluent API method for adding questions
	 * @param {any} question
	 * @returns {Section}
	 */
	addQuestion(question) {
		this.questions.push(question);
		this.#conditionAdded = false; // reset condition flag
		this.#applyConditions(question);
		return this;
	}

	/**
	 * Apply conditions to the given question
	 * @param {any} question
	 * @param [condition] - specific condition for this question
	 */
	#applyConditions(question, condition) {
		const conditions = [];

		// any section based conditions first
		if (this.#sectionCondition) {
			conditions.push(this.#sectionCondition);
		}
		// any group conditions that are active
		// Q: does the order here matter?
		const groupConditions = Object.values(this.#multiQuestionConditions)
			.filter((group) => !group.ended)
			.map((group) => group.condition);
		conditions.push(...groupConditions);

		// add the specific condition for this question
		if (condition) {
			conditions.push(condition);
		}

		// combine all conditions into a single function
		question.shouldDisplay = (response) => conditions.every((condition) => condition(response));
	}

	/**
	 * Fluent API method for attaching conditions to the previously added question
	 * @param {QuestionCondition} shouldIncludeQuestion
	 * @returns {Section}
	 */
	withCondition(shouldIncludeQuestion) {
		if (this.#conditionAdded) {
			// don't allow two conditions in a row
			throw new Error('conditions must follow a question');
		}
		this.#conditionAdded = true; // set condition flag
		const lastQuestionAdded = this.questions.length - 1;
		const question = this.questions[lastQuestionAdded];

		this.#applyConditions(question, shouldIncludeQuestion);
		return this;
	}

	withRequiredCondition(isQuestionMandatory, requiredFieldErrorMsg) {
		if (this.#conditionAdded) {
			// don't allow two conditions in a row
			throw new Error('conditions must follow a question');
		}
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
	 * Fluent API method for starting a multi question condition
	 * @param {string} conditionName
	 * @param {QuestionCondition} shouldIncludeQuestion
	 * @returns {Section}
	 */
	startMultiQuestionCondition(conditionName, shouldIncludeQuestion) {
		if (this.#multiQuestionConditions[conditionName]) {
			throw new Error('group condition already started');
		}
		this.#multiQuestionConditions[conditionName] = { ended: false, condition: shouldIncludeQuestion };
		return this;
	}

	/**
	 * Fluent API method for ending a multi question condition
	 * @param {string} conditionName
	 * @returns {Section}
	 */
	endMultiQuestionCondition(conditionName) {
		if (!this.#multiQuestionConditions[conditionName]) {
			throw new Error('group condition not started');
		}
		this.#multiQuestionConditions[conditionName].ended = true;
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

		// section is conditional, so no required questions
		// or all required questions complete
		if (requiredQuestionCount === 0 || requiredAnswerCount >= requiredQuestionCount) {
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

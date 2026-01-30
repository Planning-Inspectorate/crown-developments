import ManageListQuestion from '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js';
import nunjucks from 'nunjucks';

/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question} Question */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.d.ts').QuestionParameters} QuestionParameters */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').QuestionViewModel} QuestionViewModel */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js').ManageListQuestionParameters} ManageListQuestionParameters */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/section.js').Section} Section */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} Journey */
/**
 * @typedef {QuestionParameters & ManageListQuestionParameters & {
 *  maximumAnswers?: number;
 *  emptyListText?: string;
 * }} CustomManageListQuestionParameters
 */

export default class CustomManageListQuestion extends ManageListQuestion {
	/**
	 * @param {CustomManageListQuestionParameters} params
	 */
	#showAnswersInSummary;
	constructor(params) {
		super(params);
		this.viewFolder = 'custom-components/manage-list';
		this.#showAnswersInSummary = true;
		this.maximumAnswers = params.maximumAnswers;
		this.emptyListText = params.emptyListText || 'No items have been added yet.';
	}
	/**
	 * @param {import('#question').QuestionViewModel} viewModel
	 */
	addCustomDataToViewModel(viewModel) {
		super.addCustomDataToViewModel(viewModel);
		viewModel.question.hideRemoveButton = !viewModel.question.value || viewModel.question.value.length <= 1;
		viewModel.emptyListText = this.emptyListText;
		viewModel.hideAddButton = this.maximumAnswers && viewModel.question.value.length >= this.maximumAnswers;
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @param {String} sectionSegment
	 * @param {Journey} journey
	 * @param {Array<Object>} answer
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
	formatAnswerForSummary(sectionSegment, journey, answer) {
		let formattedAnswer = this.notStartedText;
		if (answer && Array.isArray(answer)) {
			if (this.#showAnswersInSummary) {
				const showAll = false;
				const answers = answer.map((a) => this.#formatItemAnswers(a));
				formattedAnswer = nunjucks.render(`${this.viewFolder}/answer-summary-list.njk`, { answers, showAll });
			} else if (answer.length > 0) {
				formattedAnswer = `${answer.length} ${this.title}`;
			}
		}
		const action = this.getAction(sectionSegment, journey, answer);
		const key = this.title ?? this.question;
		return [
			{
				key: key,
				value: formattedAnswer,
				action: action
			}
		];
	}

	/**
	 * check for validation errors
	 * @param {import('express').Request} req
	 * @param {Section} section
	 * @param {Journey} journey
	 * @param {ManageListQuestion} manageListQuestion
	 * @returns {QuestionViewModel|undefined} returns the view model for displaying the error or undefined if there are no errors
	 */
	checkForValidationErrors(req, section, journey, manageListQuestion) {
		const { body = {}, originalUrl } = req;
		const { errors = {}, errorSummary = [] } = body;

		if (Object.keys(errors).length > 0) {
			return this.toViewModel({
				params: req.params,
				section,
				journey,
				customViewData: {
					errors,
					errorSummary,
					originalUrl
				},
				payload: journey.response.answers,
				manageListQuestion
			});
		}
	}

	/**
	 * Format the answers to each of the manage list questions
	 * @param {{id: string, [k: string]: string}} answer
	 * @returns {{question: string, answer: string}[]}
	 */
	#formatItemAnswers(answer) {
		if (this.section.questions.length === 0) {
			return [];
		}
		const mockJourney = {
			getCurrentQuestionUrl() {},
			response: {
				answers: answer
			}
		};
		return (
			this.section.questions
				// only show questions which should be displayed based on any conditional logic
				.filter((q) => q.shouldDisplay({ answers: answer }))
				.map((q) => {
					const formatted = q
						.formatAnswerForSummary('', mockJourney, answer[q.fieldName])
						.map((a) => a.value)
						.join(', ');

					return {
						question: q.title,
						answer: formatted
					};
				})
		);
	}
}

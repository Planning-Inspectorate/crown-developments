import BooleanQuestion from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question} Question */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/section.js').Section} Section */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} Journey */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} QuestionParameters */

/**
 * Custom Boolean Question that supports actionLink override
 * This allows the question to show a "Manage" link instead of "Edit" when configured
 * @class
 */
export default class DistressingContentQuestion extends BooleanQuestion {
	/**
	 * @typedef {Omit<import('@planning-inspectorate/dynamic-forms/src/controller.js').ActionView, 'visuallyHiddenText'>} ActionLink
	 * @typedef {QuestionParameters & { actionLink?: ActionLink }} DistressingContentQuestionParameters
	 *
	 * @param {DistressingContentQuestionParameters} options
	 */
	constructor({ actionLink, ...params }) {
		super(params);
		this.actionLink = actionLink;
	}

	/**
	 * Override getAction to use actionLink if provided
	 * @type {Question['getAction']}
	 */
	getAction(sectionSegment, journey, answer) {
		if (this.actionLink) {
			return {
				href: this.actionLink.href,
				text: this.actionLink.text,
				visuallyHiddenText: this.question
			};
		}

		// Otherwise, fall back to default behavior
		return super.getAction(sectionSegment, journey, answer);
	}
}

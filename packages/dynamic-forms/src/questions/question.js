import escape from 'escape-html';
import RequiredValidator from '../validator/required-validator.js';
import RequiredFileUploadValidator from '../validator/required-file-upload-validator.js';
import { capitalize, nl2br } from '../lib/utils.js';

/**
 * @typedef {import('../validator/base-validator.js')} BaseValidator
 * @typedef {import('../journey/journey.js').Journey} Journey
 * @typedef {import('../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../section.js').Section} Section
 */

/**
 * @typedef {Object} PreppedQuestion
 * @property {Object} value
 * @property {string} question
 * @property {string} fieldName
 * @property {string} pageTitle
 * @property {string} [description]
 * @property {string} [html]
 */

/**
 * @typedef {Object} QuestionViewModel
 * @property {PreppedQuestion} question
 * @property {string} layoutTemplate
 * @property {string} pageCaption
 * @property {Array.<string>} navigation
 * @property {string} backLink
 * @property {boolean} showBackToListLink
 * @property {string} listLink
 */

/**
 * A specific question within a journey which is made up of one (usually) or many (sometimes) components and their required content.
 * @class
 */
export class Question {
	/** @type {string} - html page title, defaults to question if not provided */
	pageTitle;
	/** @type {string} - title used in the summary list */
	title;
	/** @type {string} - question shown to user on question page */
	question;
	/** @type {string|undefined} - additional information to user about the question */
	description;
	/** @type {string} the folder name of the view */
	viewFolder;
	/** @type {string} the unique name of the input on the page, also used as a url segment (should this be separated) */
	fieldName;
	/** @type {boolean} if the question should appear in the journey overview task list or not */
	taskList = true;
	/** @type {Array.<BaseValidator>} array of validators that a question uses to validate answers */
	validators = [];
	/** @type {string|undefined} hint text displayed to user */
	hint;
	/** @type {boolean} show return to listing page link after question */
	showBackToListLink = true;
	/** @type {string|undefined} alternative url slug */
	url;
	/** @type {string|undefined} optional html content */
	html;
	/** @type {string|undefined} optional question type */
	interfaceType;
	/**
	 * @param {JourneyResponse} [response]
	 * @returns {boolean}
	 */
	shouldDisplay = () => true;

	details = {
		title: '',
		text: ''
	};

	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.viewFolder
	 * @param {string} params.fieldName
	 * @param {string} [params.url]
	 * @param {string} [params.pageTitle]
	 * @param {string} [params.description]
	 * @param {Array.<BaseValidator>} [params.validators]
	 * @param {string} [params.html]
	 * @param {string} [params.hint]
	 * @param {string} [params.interfaceType]
	 * @param {(response: JourneyResponse) => boolean} [params.shouldDisplay]
	 *
	 * @param {Record<string, Function>} [methodOverrides]
	 */
	constructor(
		{
			title,
			question,
			viewFolder,
			fieldName,
			url,
			pageTitle,
			description,
			validators,
			html,
			hint,
			interfaceType,
			shouldDisplay
		},
		methodOverrides
	) {
		if (!title || title === '') throw new Error('title parameter is mandatory');
		if (!question || question === '') throw new Error('question parameter is mandatory');
		if (!viewFolder || viewFolder === '') throw new Error('viewFolder parameter is mandatory');
		if (!fieldName || fieldName === '') throw new Error('fieldName parameter is mandatory');
		this.title = title;
		this.question = question;
		this.viewFolder = viewFolder;
		this.fieldName = fieldName;
		this.url = url;
		this.html = html;
		this.pageTitle = pageTitle ?? question;
		this.description = description;
		this.hint = hint;
		this.interfaceType = interfaceType;

		if (shouldDisplay) {
			this.shouldDisplay = shouldDisplay;
		}

		if (Array.isArray(validators)) {
			this.validators = validators;
		}

		Object.entries(methodOverrides || {}).forEach(([methodName, methodOverride]) => {
			// @ts-ignore
			this[methodName] = methodOverride.bind(this);
		});
	}

	/**
	 * gets the view model for this question
	 * @param {Section} section - the current section
	 * @param {Journey} journey - the journey we are in
	 * @param {Record<string, unknown>} [customViewData] additional data to send to view
	 * @param {unknown} [payload]
	 * @returns {QuestionViewModel}
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		const answer = journey.response.answers[this.fieldName] || '';
		const backLink = journey.getNextQuestionUrl(section.segment, this.fieldName, true);

		const viewModel = {
			question: {
				value: answer,
				question: this.question,
				fieldName: this.fieldName,
				pageTitle: this.pageTitle,
				description: this.description,
				html: this.html,
				hint: this.hint,
				interfaceType: this.interfaceType
			},
			answer,

			layoutTemplate: journey.journeyTemplate,
			pageCaption: section?.name,

			navigation: ['', backLink],
			backLink,
			showBackToListLink: this.showBackToListLink,
			listLink: journey.taskListUrl,
			journeyTitle: journey.journeyTitle,
			payload,

			...customViewData
		};

		return viewModel;
	}

	/**
	 * renders the question
	 * @param {import('express').Response} res - the express response
	 * @param {QuestionViewModel} viewModel additional data to send to view
	 * @returns {void}
	 */
	renderAction(res, viewModel) {
		res.render(`components/${this.viewFolder}/index`, viewModel);
	}

	/**
	 * check for validation errors
	 * @param {import('express').Request} req
	 * @param {Journey} journey
	 * @param {Section} sectionObj
	 * @returns {QuestionViewModel|undefined} returns the view model for displaying the error or undefined if there are no errors
	 */
	checkForValidationErrors(req, sectionObj, journey) {
		const { body } = req;
		const { errors = {}, errorSummary = [] } = body;

		if (Object.keys(errors).length > 0) {
			return this.prepQuestionForRendering(
				sectionObj,
				journey,
				{
					errors,
					errorSummary
				},
				body
			);
		}
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

		responseToSave.answers[this.fieldName] = req.body[this.fieldName];

		for (const propName in req.body) {
			if (propName.startsWith(this.fieldName + '_')) {
				responseToSave.answers[propName] = req.body[propName];
				journeyResponse.answers[propName] = req.body[propName];
			}
			// todo: sort this
			// } else if (numericFields.has(propName)) {
			// 	const numericValue = Number(req.body[propName]);
			// 	if (!isNaN(numericValue)) {
			// 		responseToSave.answers[propName] = numericValue;
			// 		journeyResponse.answers[propName] = numericValue;
			// 	}
			// }
		}

		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];

		return responseToSave;
	}

	/**
	 * check for errors after saving, by default this does nothing
	 * @param {import('express').Request} req
	 * @param {Journey} journey
	 * @param {Section} sectionObj
	 * @returns {QuestionViewModel | undefined} returns the view model for displaying the error or undefined if there are no errors
	 */ //eslint-disable-next-line no-unused-vars
	checkForSavingErrors(req, sectionObj, journey) {
		return;
	}

	/**
	 * Handles redirect after saving
	 * @param {import('express').Response} res
	 * @param {Journey} journey
	 * @param {string} sectionSegment
	 * @param {string} questionSegment
	 * @returns {void}
	 */
	handleNextQuestion(res, journey, sectionSegment, questionSegment) {
		let next = journey.getNextQuestionUrl(sectionSegment, questionSegment);
		if (next === null) {
			next = journey.taskListUrl;
		}
		return res.redirect(next);
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @param {String} sectionSegment
	 * @param {Journey} journey
	 * @param {Object} answer
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
	formatAnswerForSummary(sectionSegment, journey, answer, capitals = true) {
		const formattedAnswer = capitals ? capitalize(answer ?? this.NOT_STARTED) : (answer ?? this.NOT_STARTED);
		const action = this.getAction(sectionSegment, journey, answer);
		const key = this.title ?? this.question;
		let rowParams = [];
		rowParams.push({
			key: key,
			value: nl2br(escape(formattedAnswer)),
			action: action
		});
		return rowParams;
	}

	/**
	 * Returns the action link for the question
	 * @param {Object} answer
	 * @param {Journey} journey
	 * @param {String} sectionSegment
	 * @returns {{ href: string; text: string; visuallyHiddenText: string; }}
	 */
	getAction(sectionSegment, journey, answer) {
		const isAnswerProvided = answer !== null && answer !== undefined && answer !== '';

		const action = {
			href: journey.getCurrentQuestionUrl(sectionSegment, this.fieldName),
			text: isAnswerProvided ? 'Change' : 'Answer',
			visuallyHiddenText: this.question
		};
		return action;
	}

	/**
	 * @param {unknown} answer
	 * @returns {unknown}
	 */
	format(answer) {
		return answer;
	}

	NOT_STARTED = 'Not started';

	/**
	 * @returns {boolean}
	 */
	isRequired() {
		return this.validators?.some(
			(item) => item instanceof RequiredValidator || item instanceof RequiredFileUploadValidator
		);
	}

	/**
	 * @param {JourneyResponse} journeyResponse
	 * @returns {boolean}
	 */
	isAnswered(journeyResponse) {
		return !!journeyResponse.answers[this.fieldName];
	}
}

import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import MultiFieldInputValidator from '@planning-inspectorate/dynamic-forms/src/validator/multi-field-input-validator.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.js';
import {
	APPLICATION_PROCEDURE_ID,
	APPLICATION_STAGE,
	APPLICATION_STAGE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';

/**
 *
 * @param {Object} opts
 * @param {string} opts.prefix
 * @param {string} opts.title
 * @param {boolean} opts.addressRequired
 * @returns {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function contactQuestions({ prefix, title, addressRequired }) {
	const prefixUrl = camelCaseToUrlCase(prefix);
	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {};

	questions[`${prefix}Contact`] = {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: `${title} contact`,
		question: `What are the ${title} Contact details?`,
		fieldName: prefix,
		url: `${prefixUrl}-contact`,
		inputFields: [
			{
				fieldName: `${prefix}ContactName`,
				label: 'Organisation Name'
			},
			{
				fieldName: `${prefix}ContactEmail`,
				label: 'Email'
			},
			{
				fieldName: `${prefix}ContactTelephoneNumber`,
				label: 'Telephone Number'
			}
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${prefix}ContactName`,
						required: false,
						maxLength: {
							maxLength: 250,
							maxLengthMessage: `${title} organisation must be less than 250 characters`
						},
						regex: {
							regex: "^[A-Za-z0-9 ',’(),&-]+$",
							regexMessage: `${title} organisation must only include letters, spaces, hyphens, apostrophes, commas, brackets, ampersands or numbers`
						}
					},
					{
						fieldName: `${prefix}ContactEmail`,
						required: false,
						maxLength: {
							maxLength: 250,
							maxLengthMessage: `${title} email must be less than 250 characters`
						}
					},
					{
						fieldName: `${prefix}ContactTelephoneNumber`,
						required: false,
						maxLength: {
							maxLength: 15,
							maxLengthMessage: `${title} telephone number must be less than 15 characters`
						}
					}
				]
			})
		]
	};

	questions[`${prefix}ContactAddress`] = {
		type: COMPONENT_TYPES.ADDRESS,
		title: `${title} address`,
		question: `What is the address of the ${title}?`,
		hint: addressRequired ? '' : 'Optional',
		fieldName: `${prefix}ContactAddress`,
		url: `${prefixUrl}-contact-address`,
		validators: [new AddressValidator()]
	};

	return questions;
}

/**
 * @param {Object} opts
 * @param {string} opts.fieldName
 * @param {string} [opts.title]
 * @param {string} [opts.hint]
 * @param {boolean} [opts.editable]
 * @param {Object<string, any>} [opts.viewData]
 * @returns {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps}
 */
export function dateQuestion({ fieldName, title, hint, editable = true, viewData = {} }) {
	if (!title) {
		title = camelCaseToSentenceCase(fieldName);
	}

	const errorMessages = {
		'application received date?': {
			emptyErrorMessage: 'Enter date application was received',
			noDayErrorMessage: 'Date application was received must include a day',
			noMonthErrorMessage: 'Date application was received must include a month',
			noYearErrorMessage: 'Date application was received must include a year',
			noDayMonthErrorMessage: 'Date application was received must include a day and month',
			noDayYearErrorMessage: 'Date application was received must include a day and year',
			noMonthYearErrorMessage: 'Date application was received must include a month and year',
			invalidDateErrorMessage: 'Date application was received day must be a real day',
			invalidMonthErrorMessage: 'Date application was received month must be a month between 1 and 12',
			invalidYearErrorMessage: 'Date application was received year must include 4 numbers'
		},
		'application accepted date?': {
			emptyErrorMessage: 'Enter date the application was accepted',
			noDayErrorMessage: 'Date the application was accepted must include a day',
			noMonthErrorMessage: 'Date the application was accepted must include a month',
			noYearErrorMessage: 'Date the application was accepted must include a year',
			noDayMonthErrorMessage: 'Date the application was accepted must include a day and month',
			noDayYearErrorMessage: 'Date the application was accepted must include a day and year',
			noMonthYearErrorMessage: 'Date the application was accepted must include a month and year',
			invalidDateErrorMessage: 'Date the application was accepted day must be a real day',
			invalidMonthErrorMessage: 'Date the application was accepted month must be between 1 and 12',
			invalidYearErrorMessage: 'Date the application was accepted year must include 4 numbers'
		},
		'lpa questionnaire sent date?': {
			emptyErrorMessage: 'Enter date LPA questionnaire was sent',
			noDayErrorMessage: 'Date LPA questionnaire was sent must include a day',
			noMonthErrorMessage: 'Date LPA questionnaire was sent must include a month',
			noYearErrorMessage: 'Date LPA questionnaire was sent must include a year',
			noDayMonthErrorMessage: 'Date LPA questionnaire was sent must include a day and month',
			noDayYearErrorMessage: 'Date LPA questionnaire was sent must include a day and year',
			noMonthYearErrorMessage: 'Date LPA questionnaire was sent must include a month and year',
			invalidDateErrorMessage: 'Date LPA questionnaire was sent day must be a real day',
			invalidMonthErrorMessage: 'Date LPA questionnaire was sent month must be between 1 and 12',
			invalidYearErrorMessage: 'Date LPA questionnaire was sent year must include 4 numbers'
		},
		'lpa questionnaire received date?': {
			emptyErrorMessage: 'Enter date LPA questionnaire was received',
			noDayErrorMessage: 'Date LPA questionnaire was received must include a day',
			noMonthErrorMessage: 'Date LPA questionnaire was received must include a month',
			noYearErrorMessage: 'Date LPA questionnaire was received must include a year',
			noDayMonthErrorMessage: 'Date LPA questionnaire was received must include a day and month',
			noDayYearErrorMessage: 'Date LPA questionnaire was received must include a day and year',
			noMonthYearErrorMessage: 'Date LPA questionnaire was received must include a month and year',
			invalidDateErrorMessage: 'Date LPA questionnaire was received day must be a real day',
			invalidMonthErrorMessage: 'Date LPA questionnaire was received month must be between 1 and 12',
			invalidYearErrorMessage: 'Date LPA questionnaire was received year must include 4 numbers'
		},
		'press notice date?': {
			emptyErrorMessage: 'Enter date the press notice was published',
			noDayErrorMessage: 'Date the press notice was published must include a day',
			noMonthErrorMessage: 'Date the press notice was published must include a month',
			noYearErrorMessage: 'Date the press notice was published must include a year',
			noDayMonthErrorMessage: 'Date the press notice was published must include a day and month',
			noDayYearErrorMessage: 'Date the press notice was published must include a day and year',
			noMonthYearErrorMessage: 'Date the press notice was published must include a month and year',
			invalidDateErrorMessage: 'Date the press notice was published day must be a real day',
			invalidMonthErrorMessage: 'Date the press notice was published month must be between 1 and 12',
			invalidYearErrorMessage: 'Date the press notice was published year must include 4 numbers'
		},
		'neighbours notified by lpa date?': {
			emptyErrorMessage: 'Enter date neighbours were notified by LPA',
			noDayErrorMessage: 'Date neighbours were notified by LPA must include a day',
			noMonthErrorMessage: 'Date neighbours were notified by LPA must include a month',
			noYearErrorMessage: 'Date neighbours were notified by LPA must include a year',
			noDayMonthErrorMessage: 'Date neighbours were notified by LPA must include a day and month',
			noDayYearErrorMessage: 'Date neighbours were notified by LPA must include a day and year',
			noMonthYearErrorMessage: 'Date neighbours were notified by LPA must include a month and year',
			invalidDateErrorMessage: 'Date neighbours were notified by LPA day must be a real day',
			invalidMonthErrorMessage: 'Date neighbours were notified by LPA month must be between 1 and 12',
			invalidYearErrorMessage: 'Date neighbours were notified by LPA year must include 4 numbers'
		},
		'site notice by lpa date?': {
			emptyErrorMessage: 'Enter date site notice was erected by LPA',
			noDayErrorMessage: 'Date site notice was erected by LPA must include a day',
			noMonthErrorMessage: 'Date site notice was erected by LPA must include a month',
			noYearErrorMessage: 'Date site notice was erected by LPA must include a year',
			noDayMonthErrorMessage: 'Date site notice was erected by LPA must include a day and month',
			noDayYearErrorMessage: 'Date site notice was erected by LPA must include a day and year',
			noMonthYearErrorMessage: 'Date site notice was erected by LPA must include a month and year',
			invalidDateErrorMessage: 'Date site notice was erected by LPA day must be a real day',
			invalidMonthErrorMessage: 'Date site notice was erected by LPA month must be between 1 and 12',
			invalidYearErrorMessage: 'Date site notice was erected by LPA year must include 4 numbers'
		},
		'target decision date?': {
			emptyErrorMessage: 'Enter target decision date',
			noDayErrorMessage: 'Target decision date must include a day',
			noMonthErrorMessage: 'Target decision date must include a month',
			noYearErrorMessage: 'Target decision date must include a year',
			noDayMonthErrorMessage: 'Target decision date must include a day and month',
			noDayYearErrorMessage: 'Target decision date must include a day and year',
			noMonthYearErrorMessage: 'Target decision date must include a month and year',
			invalidDateErrorMessage: 'Target decision date day must be a real day',
			invalidMonthErrorMessage: 'Target decision date month must be between 1 and 12',
			invalidYearErrorMessage: 'Target decision date year must include 4 numbers'
		},
		'extended target decision date?': {
			emptyErrorMessage: 'Enter extended target decision date',
			noDayErrorMessage: 'Extended target decision date must include a day',
			noMonthErrorMessage: 'Extended target decision date must include a month',
			noYearErrorMessage: 'Extended target decision date must include a year',
			noDayMonthErrorMessage: 'Extended target decision date must include a day and month',
			noDayYearErrorMessage: 'Extended target decision date must include a day and year',
			noMonthYearErrorMessage: 'Extended target decision date must include a month and year',
			invalidDateErrorMessage: 'Extended target decision date day must be a real day',
			invalidMonthErrorMessage: 'Extended target decision date month must be between 1 and 12',
			invalidYearErrorMessage: 'Extended target decision date year must include 4 numbers'
		},
		'recovered date?': {
			emptyErrorMessage: 'Enter date application was recovered',
			noDayErrorMessage: 'Date application was recovered must include a day',
			noMonthErrorMessage: 'Date application was recovered must include a month',
			noYearErrorMessage: 'Date application was recovered must include a year',
			noDayMonthErrorMessage: 'Date application was recovered must include a day and month',
			noDayYearErrorMessage: 'Date application was recovered must include a day and year',
			noMonthYearErrorMessage: 'Date application was recovered must include a month and year',
			invalidDateErrorMessage: 'Date application was recovered day must be a real day',
			invalidMonthErrorMessage: 'Date application was recovered month must be between 1 and 12',
			invalidYearErrorMessage: 'Date application was recovered year must include 4 numbers'
		},
		'recovered report sent date?': {
			emptyErrorMessage: 'Enter date recovered report was sent',
			noDayErrorMessage: 'Date recovered report was sent must include a day',
			noMonthErrorMessage: 'Date recovered report was sent must include a month',
			noYearErrorMessage: 'Date recovered report was sent must include a year',
			noDayMonthErrorMessage: 'Date recovered report was sent must include a day and month',
			noDayYearErrorMessage: 'Date recovered report was sent must include a day and year',
			noMonthYearErrorMessage: 'Date recovered report was sent must include a month and year',
			invalidDateErrorMessage: 'Date recovered report was sent day must be a real day',
			invalidMonthErrorMessage: 'Date recovered report was sent month must be between 1 and 12',
			invalidYearErrorMessage: 'Date recovered report was sent year must include 4 numbers'
		},
		'withdrawn date?': {
			emptyErrorMessage: 'Enter date application was withdrawn',
			noDayErrorMessage: 'Date application was withdrawn must include a day',
			noMonthErrorMessage: 'Date application was withdrawn must include a month',
			noYearErrorMessage: 'Date application was withdrawn must include a year',
			noDayMonthErrorMessage: 'Date application was withdrawn must include a day and month',
			noDayYearErrorMessage: 'Date application was withdrawn must include a day and year',
			noMonthYearErrorMessage: 'Date application was withdrawn must include a month and year',
			invalidDateErrorMessage: 'Date application was withdrawn day must be a real day',
			invalidMonthErrorMessage: 'Date application was withdrawn month must be between 1 and 12',
			invalidYearErrorMessage: 'Date application was withdrawn year must include 4 numbers'
		},
		'original decision date?': {
			emptyErrorMessage: 'Enter original decision date',
			noDayErrorMessage: 'Original decision date must include a day',
			noMonthErrorMessage: 'Original decision date must include a month',
			noYearErrorMessage: 'Original decision date must include a year',
			noDayMonthErrorMessage: 'Original decision date must include a day and month',
			noDayYearErrorMessage: 'Original decision date must include a day and year',
			noMonthYearErrorMessage: 'Original decision date must include a month and year',
			invalidDateErrorMessage: 'Original decision date day must be a real day',
			invalidMonthErrorMessage: 'Original decision date month must be between 1 and 12',
			invalidYearErrorMessage: 'Original decision date year must include 4 numbers'
		},
		'turned away date?': {
			emptyErrorMessage: 'Enter date application was turned away',
			noDayErrorMessage: 'Date application was turned away must include a day',
			noMonthErrorMessage: 'Date application was turned away must include a month',
			noYearErrorMessage: 'Date application was turned away must include a year',
			noDayMonthErrorMessage: 'Date application was turned away must include a day and month',
			noDayYearErrorMessage: 'Date application was turned away must include a day and year',
			noMonthYearErrorMessage: 'Date application was turned away must include a month and year',
			invalidDateErrorMessage: 'Date application was turned away day must be a real day',
			invalidMonthErrorMessage: 'Date application was turned away month must be between 1 and 12',
			invalidYearErrorMessage: 'Date application was turned away year must include 4 numbers'
		}
	};

	return {
		type: COMPONENT_TYPES.DATE,
		title: title,
		question: `What is the ${title?.toLowerCase()}?`,
		hint: hint,
		fieldName: fieldName,
		url: camelCaseToUrlCase(fieldName),
		validators: [
			new DateValidator(title, { ensureFuture: false, ensurePast: false }, errorMessages[title?.toLowerCase()])
		],
		editable: editable,
		viewData
	};
}

/**
 * @param {string} prefix
 * @returns {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function eventQuestions(prefix) {
	const title = titleCase(prefix);
	return {
		[`${prefix}Date`]: dateQuestion({
			fieldName: `${prefix}Date`,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: `${camelCaseToUrlCase(prefix)}-date/remove`
					}
				]
			}
		}),
		[`${prefix}Duration`]: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: `${title} Duration`,
			question: `What is the ${prefix} duration?`,
			fieldName: `${prefix}Duration`,
			url: `${prefix}-duration`,
			inputFields: [
				{
					fieldName: `${prefix}DurationPrep`,
					label: 'Prep',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Prep: ',
					formatJoinString: ' days\r\n',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				},
				{
					fieldName: `${prefix}DurationSitting`,
					label: 'Sitting',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Sitting: ',
					formatJoinString: ' days\r\n',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				},
				{
					fieldName: `${prefix}DurationReporting`,
					label: 'Reporting',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Reporting: ',
					formatJoinString: ' days',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: `${prefix}DurationPrep`,
							required: false,
							regex: {
								regex: '^$|^\\d+(\\.\\d+)?$', // Accepts empty or a decimal/integer
								regexMessage: 'Prep must be a number'
							}
						},
						{
							fieldName: `${prefix}DurationSitting`,
							required: false,
							regex: {
								regex: '^$|^\\d+(\\.\\d+)?$', // Accepts empty or a decimal/integer
								regexMessage: 'Sitting must be a number'
							}
						},
						{
							fieldName: `${prefix}DurationReporting`,
							required: false,
							regex: {
								regex: '^$|^\\d+(\\.\\d+)?$', // Accepts empty or a decimal/integer
								regexMessage: 'Reporting must be a number'
							}
						}
					]
				})
			]
		},
		[`${prefix}Venue`]: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: `${title} Venue`,
			question: `What is the venue of the ${prefix}?`,
			fieldName: `${prefix}Venue`,
			url: `${prefix}-venue`,
			validators: [
				new RequiredValidator(),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: `${title} Venue must be less than 250 characters`
					}
				})
			]
		},
		[`${prefix}NotificationDate`]: dateQuestion({ fieldName: `${prefix}NotificationDate` }),
		[`${prefix}IssuesReportPublishedDate`]: dateQuestion({ fieldName: `${prefix}IssuesReportPublishedDate` }),
		[`${prefix}ProcedureNotificationDate`]: dateQuestion({
			fieldName: `${prefix}ProcedureNotificationDate`,
			title: 'Notice of procedure date'
		}),
		[`${prefix}StatementsDate`]: dateQuestion({ fieldName: `${prefix}StatementsDate` }),
		[`${prefix}CaseManagementConferenceDate`]: dateQuestion({ fieldName: `${prefix}CaseManagementConferenceDate` }),
		[`${prefix}PreMeetingDate`]: dateQuestion({
			fieldName: `${prefix}PreMeetingDate`,
			title: 'Pre-Inquiry Meeting Date'
		}),
		[`${prefix}ProofsOfEvidenceDate`]: dateQuestion({
			fieldName: `${prefix}ProofsOfEvidenceDate`,
			title: `${titleCase(prefix)} Proofs of Evidence Date`
		})
	};
}

/**
 * @param {import('@prisma/client').Prisma.CategoryCreateInput[]} categories
 * @returns {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').Option[]}
 */
export function subCategoriesToRadioOptions(categories) {
	const parents = categories.filter((c) => !c.ParentCategory);
	const parentIdToName = Object.fromEntries(parents.map((p) => [p.id, p.displayName]));
	const subCategories = categories
		.filter((c) => c.ParentCategory)
		.map((c) => {
			const parentName = parentIdToName[c.ParentCategory.connect.id];
			return {
				displayName: `${parentName}\n ` + c.displayName,
				id: c.id
			};
		});
	return referenceDataToRadioOptions(subCategories);
}

/**
 * @param {{id: string, name: string}[]} lpaList
 * @returns {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').Option[]}
 */
export function lpaListToRadioOptions(lpaList) {
	return [
		{ text: '', value: '' }, // ensure there is a 'null' option so the first LPA isn't selected by default
		// todo: sort LPA list?
		...lpaList.map((t) => ({ text: t.name, value: t.id }))
	];
}

/**
 * @param {string} str
 * @returns {string}
 */
function camelCaseToUrlCase(str) {
	// fromCamelCase -> to-url-case
	return str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join('-');
}

/**
 * Turns 'camelCaseString' into 'Sentence case string'
 * @param {string} str
 * @returns {string}
 */
export function camelCaseToSentenceCase(str) {
	const sentence = str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join(' ');

	return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function titleCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function filteredStagesToRadioOptions(procedureId) {
	const stageIds = [
		APPLICATION_STAGE_ID.ACCEPTANCE,
		APPLICATION_STAGE_ID.CONSULTATION,
		APPLICATION_STAGE_ID.PROCEDURE_DECISION
	];
	if (procedureId) {
		const mappedProcedureId =
			procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS
				? APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS
				: procedureId;
		const procedure = APPLICATION_STAGE.find((procedure) => procedure.id === mappedProcedureId);
		const procedureStage = APPLICATION_STAGE.find((stage) => stage.displayName === procedure.displayName).id;
		stageIds.push(procedureStage);
	}
	stageIds.push(APPLICATION_STAGE_ID.DECISION);
	return APPLICATION_STAGE.filter((stage) => stageIds.includes(stage.id)).map((s) => ({
		id: s.id,
		displayName: s.displayName
	}));
}

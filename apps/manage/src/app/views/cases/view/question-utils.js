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
import { CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.js';
import CILAmountValidator from '@pins/crowndev-lib/forms/custom-components/cil-amount/cil-amount-validator.js';
import { camelCaseToUrlCase, camelCaseToSentenceCase, sentenceCase } from '@pins/crowndev-lib/util/string.js';

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
		question: `What are the ${title.toLowerCase()} contact details?`,
		fieldName: prefix,
		url: `${prefixUrl}-contact`,
		inputFields: [
			{
				fieldName: `${prefix}ContactName`,
				label: 'Organisation name'
			},
			{
				fieldName: `${prefix}ContactEmail`,
				label: 'Email'
			},
			{
				fieldName: `${prefix}ContactTelephoneNumber`,
				label: 'Telephone number'
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
							maxLengthMessage: `${title} organisation name must be 250 characters or less`
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
							maxLength: 50,
							maxLengthMessage: `${title} email must be 50 characters or less`
						}
					},
					{
						fieldName: `${prefix}ContactTelephoneNumber`,
						required: false,
						maxLength: {
							maxLength: 15,
							maxLengthMessage: `${title} telephone number must be 15 characters or less`
						},
						regex: {
							regex: '^\\+?\\d+$',
							regexMessage: 'Enter a valid telephone number'
						}
					}
				]
			})
		]
	};

	questions[`${prefix}ContactAddress`] = {
		type: COMPONENT_TYPES.ADDRESS,
		title: `${title} address`,
		question: `What is the ${title.toLowerCase()} address?`,
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
 * @param {string} [opts.title] This should be uncapitalised (unless it's a proper noun)
 * @param {string} [opts.hint]
 * @param {boolean} [opts.editable]
 * @param {string} [opts.question]
 * @param {Object<string, any>} [opts.viewData]
 * @param {string} [opts.question]
 * @param {string|null} [opts.emptyErrorMessage]
 * @param {string|null} [opts.validationTitle] This should be uncapitalised (unless it's a proper noun). Only required if specified differently to title in validation messages.
 * @returns {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps}
 */
export function dateQuestion({
	fieldName,
	title,
	hint,
	editable = true,
	viewData = {},
	question,
	emptyErrorMessage = null,
	validationTitle = null
}) {
	// remove capitalisation for fallback title, since used in fallback question
	const fallbackTitle = camelCaseToSentenceCase(fieldName).toLowerCase();
	if (!title) {
		title = fallbackTitle;
	}
	validationTitle = validationTitle ?? title;
	return {
		type: COMPONENT_TYPES.DATE,
		title: sentenceCase(title),
		question: question || `What is the ${title}?`,
		hint: hint,
		fieldName: fieldName,
		url: camelCaseToUrlCase(fieldName),
		validators: [
			new DateValidator(
				validationTitle,
				{ ensureFuture: false, ensurePast: false },
				{ emptyErrorMessage: emptyErrorMessage }
			)
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
	const title = sentenceCase(prefix);
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
			},
			question: `What date is the ${prefix}?`
		}),
		[`${prefix}Duration`]: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: `${title} duration`,
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
			title: `${title} venue`,
			question: `What is the venue of the ${prefix}?`,
			fieldName: `${prefix}Venue`,
			url: `${prefix}-venue`,
			validators: [
				new RequiredValidator(`Enter ${prefix} venue`),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: `${title} venue must be less than 250 characters`
					}
				})
			]
		},
		[`${prefix}NotificationDate`]: dateQuestion({
			fieldName: `${prefix}NotificationDate`,
			question: `What is the ${prefix} notification date?`
		}),
		[`${prefix}IssuesReportPublishedDate`]: dateQuestion({
			fieldName: `${prefix}IssuesReportPublishedDate`,
			question: `When was the ${prefix} issues report published?`,
			validationTitle: `date the ${prefix} issues report was published`
		}),
		[`${prefix}ProcedureNotificationDate`]: dateQuestion({
			fieldName: `${prefix}ProcedureNotificationDate`,
			title: 'Notice of procedure date'
		}),
		[`${prefix}StatementsDate`]: dateQuestion({ fieldName: `${prefix}StatementsDate` }),
		[`${prefix}CaseManagementConferenceDate`]: dateQuestion({ fieldName: `${prefix}CaseManagementConferenceDate` }),
		[`${prefix}PreMeetingDate`]: dateQuestion({
			fieldName: `${prefix}PreMeetingDate`,
			title: 'Pre-inquiry meeting date'
		}),
		[`${prefix}ProofsOfEvidenceDate`]: dateQuestion({
			fieldName: `${prefix}ProofsOfEvidenceDate`,
			title: `${sentenceCase(prefix)} proofs of evidence date`
		})
	};
}

/**
 * @param {import('@pins/crowndev-database').Prisma.CategoryCreateInput[]} categories
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

export const CIL_DATA = {
	type: CUSTOM_COMPONENTS.CIL_AMOUNT,
	question: 'Is the application liable for the Community Infrastructure Levy (CIL)?',
	fieldName: 'cilLiable',
	url: 'cil-liable',
	cilAmountInputFieldName: 'cilAmount',
	cilAmountQuestion: 'What is the CIL amount?',
	validators: [new CILAmountValidator()]
};

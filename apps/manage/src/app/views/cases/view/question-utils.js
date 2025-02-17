import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import DateValidator from '@pins/dynamic-forms/src/validator/date-validator.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import MultiFieldInputValidator from '@pins/dynamic-forms/src/validator/multi-field-input-validator.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';

/**
 *
 * @param {Object} opts
 * @param {string} opts.prefix
 * @param {string} opts.title
 * @param {boolean} opts.addressRequired
 * @returns {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function contactQuestions({ prefix, title, addressRequired }) {
	const prefixUrl = camelCaseToUrlCase(prefix);
	/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {};

	questions[`${prefix}Contact`] = {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: `${title} Contact`,
		question: `What are the ${title} Contact details?`,
		fieldName: prefix,
		url: `${prefixUrl}-contact`,
		inputFields: [
			{
				fieldName: `${prefix}ContactName`,
				label: 'Name'
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
							maxLengthMessage: `${title} name must be less than 250 characters`
						},
						regex: {
							regex: "^[A-Za-z0-9 '’-]*$",
							regexMessage: 'Full name must only include letters, spaces, hyphens, apostrophes or numbers'
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
		title: `${title} Address`,
		question: `What is the address of the ${title}?`,
		hint: addressRequired ? '' : 'Optional',
		fieldName: `${prefix}ContactAddress`,
		url: `${prefixUrl}-contact-address`,
		validators: [new AddressValidator()]
	};

	return questions;
}

/**
 * @param {string} fieldName
 * @param {string} [title]
 * @returns {import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps}
 */
export function dateQuestion(fieldName, title) {
	if (!title) {
		title = camelCaseToTitleCase(fieldName);
	}
	return {
		type: COMPONENT_TYPES.DATE,
		title: title,
		question: `What is the ${title}?`,
		fieldName: fieldName,
		url: camelCaseToUrlCase(fieldName),
		validators: [new DateValidator(title)]
	};
}

/**
 * @param {string} prefix
 * @returns {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function eventQuestions(prefix) {
	const title = titleCase(prefix);
	return {
		[`${prefix}Date`]: dateQuestion(`${prefix}Date`),
		[`${prefix}Duration`]: {
			type: COMPONENT_TYPES.RADIO,
			title: `${title} Duration`,
			question: `What is the ${prefix} duration?`,
			fieldName: `${prefix}Duration`,
			url: `${prefix}-duration`,
			validators: [new RequiredValidator()],
			options: [
				{ text: 'Prep', value: 'Prep' },
				{ text: 'Sitting', value: 'Sitting' },
				{
					text: 'Reporting',
					value: 'Reporting'
				}
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
		[`${prefix}NotificationDate`]: dateQuestion(`${prefix}NotificationDate`),
		[`${prefix}IssuesReportPublishedDate`]: dateQuestion(`${prefix}IssuesReportPublishedDate`),
		[`${prefix}ProcedureNotificationDate`]: dateQuestion(`${prefix}ProcedureNotificationDate`),
		[`${prefix}StatementsDate`]: dateQuestion(`${prefix}StatementsDate`),
		[`${prefix}CaseManagementConferenceDate`]: dateQuestion(`${prefix}CaseManagementConferenceDate`),
		[`${prefix}ProofsOfEvidenceDate`]: dateQuestion(
			`${prefix}ProofsOfEvidenceDate`,
			`${titleCase(prefix)} Proofs of Evidence Date`
		)
	};
}

/**
 * @param {{displayName?: string, id: string}[]} reference
 * @param {boolean} [addNullOption]
 * @returns {import('@pins/dynamic-forms/src/questions/question-props.js').Option[]}
 */
export function referenceDataToRadioOptions(reference, addNullOption = false) {
	const options = reference.map((t) => ({ text: t.displayName, value: t.id }));
	if (addNullOption) {
		options.unshift({ text: '', value: '' });
	}
	return options;
}

/**
 * @param {import('@prisma/client').Prisma.CategoryCreateInput[]} categories
 * @returns {import('@pins/dynamic-forms/src/questions/question-props.js').Option[]}
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
 * @returns {import('@pins/dynamic-forms/src/questions/question-props.js').Option[]}
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
 * @param {string} str
 * @returns {string}
 */
function camelCaseToTitleCase(str) {
	// fromCamelCase -> To Url Case
	return str
		.split(/(?=[A-Z])/)
		.map(titleCase)
		.join(' ');
}

function titleCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

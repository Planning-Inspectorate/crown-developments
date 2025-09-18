import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import MultiFieldInputValidator from '@planning-inspectorate/dynamic-forms/src/validator/multi-field-input-validator.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.js';

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
		title: `${title} Contact`,
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
		title = camelCaseToTitleCase(fieldName);
	}
	return {
		type: COMPONENT_TYPES.DATE,
		title: title,
		question: `What is the ${title?.toLowerCase()}?`,
		hint: hint,
		fieldName: fieldName,
		url: camelCaseToUrlCase(fieldName),
		validators: [new DateValidator(title)],
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

/**
 * Clear procedure-specific fields on a viewModel and prepare DB update input to clear Event/procedureNotificationDate.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {string|null} procedureId
 * @param {string|null} originalProcedureId
 * @param {Object|null} updateInput
 */
export function clearProcedureFields(viewModel, procedureId, originalProcedureId, updateInput) {
	const fields = [
		'writtenRepsProcedureNotificationDate',
		'hearingProcedureNotificationDate',
		'procedureNotificationDate',
		'hearingDate',
		'hearingDuration',
		'hearingVenue',
		'hearingNotificationDate',
		'hearingIssuesReportPublishedDate',
		'hearingStatementsDate',
		'hearingCaseManagementConferenceDate',
		'hearingDurationPrep',
		'hearingDurationSitting',
		'hearingDurationReporting',
		'inquiryProcedureNotificationDate',
		'inquiryStatementsDate',
		'inquiryDate',
		'inquiryDuration',
		'inquiryVenue',
		'inquiryNotificationDate',
		'inquiryCaseManagementConferenceDate',
		'inquiryProofsOfEvidenceDate',
		'inquiryDurationPrep',
		'inquiryDurationSitting',
		'inquiryDurationReporting'
	];
	fields.forEach((field) => {
		viewModel[field] = null;
	});

	if (updateInput) {
		Object.assign(updateInput, {
			procedureNotificationDate: null,
			Event: {
				update: {
					data: {
						date: null,
						prepDuration: null,
						sittingDuration: null,
						reportingDuration: null,
						venue: null,
						notificationDate: null,
						issuesReportPublishedDate: null,
						statementsDate: null,
						caseManagementConferenceDate: null,
						proofsOfEvidenceDate: null
					}
				}
			}
		});
	}
}

/**
 * If the procedure has changed on the existing DB record, return an update object that clears procedure fields.
 *
 * @param {{db: import('#service').DbService}} serviceOrCtx - object containing db (keeps signature similar to prior usage)
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @param {string} applicationId
 * @returns {Promise<Object>} update input with fields to clear (or empty object)
 */
export async function clearProcedureData({ db }, edits, viewModel, applicationId) {
	const updateInput = {};
	const validProcedures = ['hearing', 'inquiry', 'written-reps'];
	const { procedureId } = edits;

	if (procedureId && validProcedures.includes(procedureId)) {
		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id: applicationId },
			select: { procedureId: true, eventId: true }
		});
		if (crownDevelopment?.eventId && crownDevelopment.procedureId && crownDevelopment.procedureId !== procedureId) {
			clearProcedureFields(viewModel, procedureId, crownDevelopment.procedureId, updateInput);
		}
	}

	delete updateInput.procedureId;
	return updateInput;
}

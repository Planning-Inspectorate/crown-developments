import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import DateValidator from '@pins/dynamic-forms/src/validator/date-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import NumericValidator from '@pins/dynamic-forms/src/validator/numeric-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import { APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.js';
import { contactQuestions } from './question-utils.js';

/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props').QuestionProps>} */
export const questionProps = {
	typeOfApplication: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Application type',
		question: 'What type of application is it?',
		fieldName: 'typeOfApplication',
		url: 'type-of-application',
		validators: [new RequiredValidator()],
		options: APPLICATION_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
	},
	// TODO: lpa autocomplete
	// lpa address needed?
	...contactQuestions({
		prefix: 'lpaContact',
		title: 'LPA Contact',
		addressRequired: false
	}),
	...contactQuestions({
		prefix: 'applicant',
		title: 'Applicant',
		addressRequired: true
	}),
	hasAgent: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Has Agent',
		question: 'Is the applicant using an agent?',
		fieldName: 'hasAgent',
		url: 'has-agent',
		validators: [new RequiredValidator()]
	},
	...contactQuestions({
		prefix: 'agent',
		title: 'Agent',
		addressRequired: true
	}),
	sitePostCode: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Site Postcode',
		question: 'What is the postcode of the site?',
		hint: 'Optional',
		fieldName: 'sitePostcode',
		url: 'site-postcode',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 10,
					maxLengthMessage: `Postcode must be 10 characters or less`
				}
			})
			// todo: better validation of postcode
		]
	},
	siteNorthing: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Site Northing',
		question: 'What is the northing coordinate of the site?',
		hint: 'Optional',
		fieldName: 'siteNorthing',
		url: 'site-northing',
		validators: []
	},
	siteEasting: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Site Easting',
		question: 'What is the easting coordinate of the site?',
		hint: 'Optional',
		fieldName: 'siteEasting',
		url: 'site-easting',
		validators: []
	},
	siteArea: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Site Area (ha)',
		question: 'What is area of the site in hectares?',
		suffix: 'ha',
		fieldName: 'siteArea',
		url: 'site-area',
		validators: [new RequiredValidator(), new NumericValidator({ min: 0 })]
	},
	projectName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Project Name',
		question: 'What is the name of the project?',
		fieldName: 'projectName',
		url: 'project-name',
		validators: [
			new RequiredValidator(),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Project name must be 250 characters or less`
				}
			})
		]
	},
	projectDescription: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Project Description',
		question: 'What is the description of the project?',
		fieldName: 'projectDescription',
		url: 'project-description',
		validators: [
			new RequiredValidator(),
			new StringValidator({
				maxLength: {
					maxLength: 1000,
					maxLengthMessage: `Project Description must be 1000 characters or less`
				}
			})
		]
	},
	expectedDateOfSubmission: {
		type: COMPONENT_TYPES.DATE,
		title: 'Expected date of submission',
		question: 'What is the expected date of submission?',
		fieldName: 'expectedDateOfSubmission',
		url: 'expected-date-of-submission',
		validators: [new DateValidator('Expected date of submission')]
	}
};

export const getQuestions = () => createQuestions(questionProps, questionClasses, {});

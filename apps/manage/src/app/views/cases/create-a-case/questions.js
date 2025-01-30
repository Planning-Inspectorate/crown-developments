import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import DateValidator from '@pins/dynamic-forms/src/validator/date-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import NumericValidator from '@pins/dynamic-forms/src/validator/numeric-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import { APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.js';
import { contactQuestions } from './question-utils.js';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../config.js';
import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';

export function getQuestions() {
	const env = loadEnvironmentConfig();

	// this is to avoid a database read when the data is static - but it does vary by environment
	// the options here should match the dev/prod seed scripts
	const LPAs = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	const lpaOptions = [
		{ text: '', value: '' }, // ensure there is a 'null' option so the first LPA isn't selected by default
		...LPAs.map((t) => ({ text: t.name, value: t.id }))
		// todo: sort LPA list?
	];

	/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {
		typeOfApplication: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application type',
			question: 'What type of application is it?',
			fieldName: 'typeOfApplication',
			url: 'type-of-application',
			validators: [new RequiredValidator('Select the type of application')],
			options: APPLICATION_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		localPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'LPA',
			question: 'Select the Local Planning Authority for this application',
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [new RequiredValidator('Select Local Planning Authority')],
			options: lpaOptions
		},
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
			validators: [new RequiredValidator('Select if the applicant is using an agent')]
		},
		...contactQuestions({
			prefix: 'agent',
			title: 'Agent',
			addressRequired: true
		}),
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: `Site Address`,
			question: `What is the address of the site?`,
			hint: 'Optional',
			fieldName: `siteAddress`,
			url: `site-address`,
			validators: [new AddressValidator({ required: false })]
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
		applicationDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Application Description',
			question: 'What is the description of the application?',
			fieldName: 'applicationDescription',
			url: 'application-description',
			validators: [
				new RequiredValidator(),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: `Application Description must be 1000 characters or less`
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

	return createQuestions(questions, questionClasses, {});
}

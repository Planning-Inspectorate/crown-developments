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
import CoordinatesValidator from '@pins/dynamic-forms/src/validator/coordinates-validator.js';

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
			addressRequired: false
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
			addressRequired: false
		}),
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: `Site Address`,
			question: `What is the address of the site?`,
			hint: 'Optional',
			fieldName: `siteAddress`,
			url: `site-address`,
			validators: [new AddressValidator()]
		},
		siteCoordinates: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Site Coordinates',
			question: 'What are the coordinates of the site?',
			fieldName: 'siteCoordinates',
			url: 'site-coordinates',
			notStartedTest: '-',
			inputFields: [
				{
					fieldName: 'siteNorthing',
					label: 'Northing',
					formatPrefix: 'Northing: ',
					hint: 'Optional'
				},
				{
					fieldName: 'siteEasting',
					label: 'Easting',
					formatPrefix: 'Easting: ',
					hint: 'Optional'
				}
			],
			validators: [
				new CoordinatesValidator(
					{ title: 'Northing', fieldName: 'siteNorthing' },
					{ title: 'Easting', fieldName: 'siteEasting' }
				)
			]
		},
		siteArea: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Site Area (ha)',
			question: 'What is the area of the site in hectares?',
			suffix: 'ha',
			fieldName: 'siteArea',
			url: 'site-area',
			validators: [new NumericValidator({ regex: /^$|^\d+(\.\d+)?$/, regexMessage: 'The value must be at least 0' })]
		},
		applicationDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Application Description',
			question: 'What is the description of the application?',
			fieldName: 'applicationDescription',
			url: 'application-description',
			validators: [
				new RequiredValidator('Enter application description'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Applicant description must be less than 1000 characters'
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

	const textOverrides = {
		emptyAnswerText: ''
	};
	return createQuestions(questions, questionClasses, {}, textOverrides);
}

import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import NumericValidator from '@planning-inspectorate/dynamic-forms/src/validator/numeric-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.js';
import { contactQuestions, multiContactQuestions } from './question-utils.js';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../config.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import CoordinatesValidator from '@planning-inspectorate/dynamic-forms/src/validator/coordinates-validator.js';
import SameAnswerValidator from '@planning-inspectorate/dynamic-forms/src/validator/same-answer-validator.js';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.js';
import CustomManageListValidator from '@pins/crowndev-lib/forms/custom-components/manage-list/validator.js';
import CrossQuestionValidator from '@pins/crowndev-lib/validators/cross-question-validator.js';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { isDefined } from '@pins/crowndev-lib/util/boolean.js';

/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response').JourneyResponse} JourneyResponse */

/**
 *
 * @param {JourneyResponse} journeyResponse
 * @returns
 */
export function getQuestions(journeyResponse) {
	const env = loadEnvironmentConfig();

	// this is to avoid a database read when the data is static - but it does vary by environment
	// the options here should match the dev/prod seed scripts
	const LPAs = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	const lpaOptions = [
		{ text: '', value: '' }, // ensure there is a 'null' option so the first LPA isn't selected by default
		...LPAs.map((t) => ({ text: t.name, value: t.id }))
		// todo: sort LPA list?
	];

	// derive applicant organisation radio options from manageApplicants answers held in the journey response
	const applicantOrganisationOptions = (() => {
		const organisations = journeyResponse?.answers?.manageApplicantDetails;
		if (!Array.isArray(organisations) || organisations.length === 0) return [];
		return organisations
			.map((answer) => {
				const name = answer?.organisationName || '';
				const id = answer?.id;
				if (!name || !id) return null;
				return { text: name, value: id };
			})
			.filter(isDefined);
	})();

	const validateContactsAgainstOrganisations = (contacts, organisations) => {
		if (!Array.isArray(contacts) || !Array.isArray(organisations)) return true; // other validators will catch this

		const contactOrgIds = contacts.map((contact) => contact.applicantContactOrganisation);
		const applicantOrgIds = organisations.map((org) => org.id);
		const allContactsHaveValidOrg = contactOrgIds.every((orgId) => applicantOrgIds.includes(orgId));
		// This only happens if an organisation was deleted after a contact was added
		if (!allContactsHaveValidOrg) {
			throw new Error('All applicant contacts must be associated with an applicant organisation');
		}

		organisations.forEach((organisation) => {
			const hasMatchingContact = contacts.some((contact) => contact.applicantContactOrganisation === organisation.id);
			if (!hasMatchingContact) {
				throw new Error(`You must add a contact for ${organisation.organisationName}`);
			}
		});

		return true;
	};

	// When there is no agent, at least one applicant contact is required
	const hasAgentAnswer = yesNoToBoolean(journeyResponse?.answers?.hasAgent);
	const applicantContactsValidator = hasAgentAnswer
		? []
		: [
				new CustomManageListValidator({
					minimumAnswers: 1,
					errorMessages: {
						minimumAnswers: `At least one contact is required`
					}
				}),
				new CrossQuestionValidator({
					dependencyFieldName: 'manageApplicantDetails',
					validationFunction: validateContactsAgainstOrganisations
				})
			];

	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
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
			question: 'Select the local planning authority for this application',
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [
				new SameAnswerValidator(
					['secondaryLpaId'],
					'Local Planning Authority cannot be the same as the secondary Local Planning Authority'
				),
				new RequiredValidator('Select the local planning authority')
			],
			options: lpaOptions
		},
		...contactQuestions({
			prefix: 'applicant',
			title: 'Applicant',
			addressRequired: false
		}),
		manageApplicants: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: 'Check applicant details',
			question: 'Check applicant details',
			url: 'check-applicant-details',
			fieldName: 'manageApplicantDetails',
			titleSingular: 'Applicant',
			emptyListText: 'No applicants found',
			showAnswersInSummary: true,
			maximumAnswers: 5,
			validators: [
				new CustomManageListValidator({
					minimumAnswers: 1,
					errorMessages: {
						minimumAnswers: 'At least one applicant organisation is required'
					}
				})
			]
		},
		addApplicantName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Applicant organisation name',
			question: 'What is the name of the applicant organisation?',
			url: 'add-applicant-details',
			fieldName: 'organisationName',
			validators: [new RequiredValidator('Enter the applicant organisation name')]
		},
		addApplicantAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Applicant address',
			question: 'What is the address of the applicant organisation?',
			url: 'applicant-address',
			fieldName: 'organisationAddress',
			validators: [new AddressValidator()]
		},
		manageApplicantContacts: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: 'Check applicant contact details',
			question: 'Check applicant contact details',
			url: 'check-applicant-contact-details',
			fieldName: 'manageApplicantContactDetails',
			titleSingular: 'Applicant contact',
			emptyListText: 'No applicant contacts found',
			showAnswersInSummary: true,
			maximumAnswers: 10,
			isAllowedEmpty: yesNoToBoolean(journeyResponse?.answers?.hasAgent), // if there is an agent, applicant contacts are optional
			validators: applicantContactsValidator // populated from session-managed journey response
		},
		...multiContactQuestions({
			prefix: 'applicant',
			title: 'applicant',
			options: applicantOrganisationOptions // populated from session-managed journey response
		}),
		hasSecondaryLpa: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Has Secondary Local Planning Authority',
			question: 'Is there a secondary Local Planning Authority for this application?',
			fieldName: 'hasSecondaryLpa',
			url: 'has-secondary-local-planning-authority',
			validators: [new RequiredValidator('Select if the applicant is using a secondary local planning authority')]
		},
		secondaryLocalPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Secondary LPA',
			question: 'Select the secondary Local Planning Authority for this application',
			fieldName: 'secondaryLpaId',
			url: 'secondary-local-planning-authority',
			validators: [
				new SameAnswerValidator(
					['lpaId'],
					'Secondary Local Planning Authority cannot be the same as the Local Planning Authority'
				),
				new RequiredValidator('Select the secondary Local Planning Authority')
			],
			options: lpaOptions
		},
		hasAgent: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Has agent',
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
			title: `Site address`,
			question: `What is the site address?`,
			hint: 'Optional',
			fieldName: `siteAddress`,
			url: `site-address`,
			validators: [new AddressValidator()]
		},
		siteCoordinates: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Site coordinates',
			question: 'What are the coordinates of the site?',
			hint: 'Optional',
			fieldName: 'siteCoordinates',
			url: 'site-coordinates',
			inputFields: [
				{
					fieldName: 'siteEasting',
					label: 'Easting',
					formatPrefix: 'Easting: '
				},
				{
					fieldName: 'siteNorthing',
					label: 'Northing',
					formatPrefix: 'Northing: '
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
			title: 'Site area (ha)',
			question: 'What is the area of the site in hectares?',
			suffix: 'ha',
			hint: 'Optional',
			fieldName: 'siteArea',
			url: 'site-area',
			validators: [
				new NumericValidator({ regex: /^$|^\d+(\.\d+)?$/, regexMessage: 'The area of the site must be a number' })
			]
		},
		developmentDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Development description',
			question: 'What is the description of the development?',
			hint: 'This will be published on the website.',
			fieldName: 'developmentDescription',
			url: 'development-description',
			validators: [
				new RequiredValidator('Enter description of the proposed development'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Description of the proposed development must be 1000 characters or less'
					}
				})
			]
		},
		expectedDateOfSubmission: {
			type: COMPONENT_TYPES.DATE,
			title: 'Expected date of submission',
			question: 'What is the expected submission date for the application?',
			fieldName: 'expectedDateOfSubmission',
			url: 'expected-date-of-submission',
			validators: [new DateValidator('expected submission date')]
		}
	};
	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};
	return createQuestions(questions, classes, journeyResponse || {});
}

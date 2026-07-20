import { randomInt } from 'node:crypto';
import { type Page } from '@playwright/test';

import { applicationCreateCaseJourneys } from '../fixtures/application-journeys.ts';
import { preApplicationCreateCaseJourneys } from '../fixtures/pre-application-journeys.ts';
import { type UkAddress } from '../page-components/address.component.ts';
import { type ContactDetails } from '../page-components/contact-details.component.ts';
import { PageManager } from '../page-objects/page-manager.index.ts';
import {
	APPLICANT_USING_AGENT,
	APPLICATION_CLASSIFICATION,
	APPLICATION_STAGE,
	APPLICATION_TYPE,
	SECONDARY_LOCAL_PLANNING_AUTHORITY
} from '../page-strings/create-case.strings.ts';
import { type CreateCaseJourney } from '../types/create-case-journey.type.ts';
import { type PageValidation } from './page-validation.utility.ts';

export type CreateCaseJourneyName =
	| (typeof preApplicationCreateCaseJourneys)[number]['name']
	| (typeof applicationCreateCaseJourneys)[number]['name'];

export type CreateCaseCapturedAnswers = {
	journeyName: string;
	applicationStage: string;
	applicationClassification?: string;
	applicationType: string;
	localPlanningAuthority: string;
	lpaContactDetails: ContactDetails;
	hasSecondaryLocalPlanningAuthority: string;
	secondaryLocalPlanningAuthority?: string;
	secondaryLpaContactDetails?: ContactDetails;
	hasAgent: string;
	agentOrganisationName?: string;
	agentOrganisationAddress?: UkAddress;
};

type CreateCaseUtilityOptions = {
	fullValidation?: boolean;
	validateCheckAnswers?: boolean;
};

const CREATE_CASE_START_URL = '/s62a/cases/create-a-case/questions/pre-application-or-application';
const CHECK_YOUR_ANSWERS_TITLE = 'Check your answers';

const CHECK_YOUR_ANSWERS_ROWS = {
	applicationStage: {
		key: 'Application stage',
		actionHrefContains: 'pre-application-or-application'
	},
	applicationClassification: {
		key: 'Application classification',
		actionHrefContains: 'major-or-non-major'
	},
	applicationType: {
		key: 'Application type',
		actionHrefContains: 'application-type'
	},
	localPlanningAuthority: {
		key: 'LPA',
		actionHrefContains: 'local-planning-authority'
	},
	lpaContactDetails: {
		key: 'LPA',
		actionHrefContains: 'lpa-contact-details'
	},
	hasSecondaryLocalPlanningAuthority: {
		key: 'Secondary LPA?',
		actionHrefContains: 'has-secondary-local-planning-authority'
	},
	secondaryLocalPlanningAuthority: {
		key: 'Secondary LPA name',
		actionHrefContains: 'secondary-local-planning-authority'
	},
	secondaryLpaContactDetails: {
		key: 'Secondary LPA name',
		actionHrefContains: 'secondary-lpa-contact-details'
	},
	hasAgent: {
		key: 'Agent?',
		actionHrefContains: 'has-agent'
	},
	agentOrganisationName: {
		key: 'Agent organisation name',
		actionHrefContains: 'add-agent-details'
	},
	agentOrganisationAddress: {
		key: 'Agent address',
		actionHrefContains: 'agent-address'
	}
} as const;

const allJourneys: readonly CreateCaseJourney[] = [
	...preApplicationCreateCaseJourneys,
	...applicationCreateCaseJourneys
];

export class CreateCaseUtility {
	private readonly page: Page;
	private readonly pageManager: PageManager;

	constructor(page: Page) {
		this.page = page;
		this.pageManager = new PageManager(page);
	}

	public async createCaseByJourneyName(
		journeyName: CreateCaseJourneyName,
		options: CreateCaseUtilityOptions = {}
	): Promise<CreateCaseCapturedAnswers> {
		const journey = allJourneys.find((item) => item.name === journeyName);

		if (!journey) {
			throw new Error(`Journey not found: ${journeyName}`);
		}

		return await this.createCase(journey, options);
	}

	public async createCase(
		journey: CreateCaseJourney,
		options: CreateCaseUtilityOptions = {}
	): Promise<CreateCaseCapturedAnswers> {
		const { fullValidation = true, validateCheckAnswers = true } = options;

		const pageValidation: PageValidation = fullValidation ? 'fullValidation' : 'basicValidation';

		const answers: Partial<CreateCaseCapturedAnswers> = {
			journeyName: journey.name,
			applicationStage: APPLICATION_STAGE.options[journey.variant],
			applicationType: APPLICATION_TYPE.options[journey.applicationType],
			hasSecondaryLocalPlanningAuthority:
				SECONDARY_LOCAL_PLANNING_AUTHORITY.options[journey.hasSecondaryLocalPlanningAuthority],
			hasAgent: APPLICANT_USING_AGENT.options[journey.hasAgent]
		};

		await this.page.goto(CREATE_CASE_START_URL);

		// Is this a pre-application or an application?
		await this.pageManager.applicationStage.assertions.isPageDisplayed({
			pageValidation
		});

		await this.pageManager.applicationStage.actions.selectApplicationStage(journey.variant);
		await this.pageManager.applicationStage.assertions.hasSelectedRadioButton(journey.variant);
		await this.clickContinue();

		// Is this a major or non-major application?
		if (journey.variant === 'application') {
			answers.applicationClassification = APPLICATION_CLASSIFICATION.options[journey.applicationClassification];

			await this.pageManager.applicationClassification.assertions.isPageDisplayed({
				pageValidation
			});

			await this.pageManager.applicationClassification.actions.selectApplicationClassification(
				journey.applicationClassification
			);

			await this.pageManager.applicationClassification.assertions.hasSelectedRadioButton(
				journey.applicationClassification
			);

			await this.clickContinue();
		}

		// What type of application is it?
		// What type of application is this pre-application advice for?
		await this.pageManager.applicationType.assertions.isPageDisplayed({
			variant: journey.variant,
			pageValidation
		});

		await this.pageManager.applicationType.actions.selectApplicationType(journey.applicationType);
		await this.pageManager.applicationType.assertions.hasSelectedRadioButton(journey.applicationType);
		await this.clickContinue();

		// First LPA
		// Which local planning authority is this application related to?
		// Which local planning authority is this pre-application advice related to?
		await this.pageManager.whichPlanningAuthority.assertions.isPageDisplayed({
			variant: journey.variant,
			WhichPlanningAuthorityType: 'primary',
			pageValidation
		});

		answers.localPlanningAuthority = await this.selectRandomPlanningAuthority('lpaId');

		await this.pageManager.whichPlanningAuthority.assertions.hasPlanningAuthorityValue(answers.localPlanningAuthority);

		await this.clickContinue();

		// What are the LPA's contact details?
		await this.pageManager.lpaContactDetail.assertions.isPageDisplayed({
			localPlanningAuthorityContactDetailsType: 'primary',
			pageValidation
		});

		answers.lpaContactDetails =
			await this.pageManager.lpaContactDetail.contactDetails.actions.enterGeneratedContactDetails(
				journey.lpaContactDetails
			);

		await this.pageManager.lpaContactDetail.contactDetails.assertions.hasContactDetailsValues(
			answers.lpaContactDetails
		);

		await this.clickContinue();

		// Secondary LPA
		// Does this application have a secondary local planning authority?
		// Does this pre-application advice have a secondary local planning authority?
		await this.pageManager.secondaryPlanningAuthority.assertions.isPageDisplayed({
			variant: journey.variant,
			pageValidation
		});

		await this.pageManager.secondaryPlanningAuthority.actions.selectSecondaryLPAOption(
			journey.hasSecondaryLocalPlanningAuthority
		);

		await this.pageManager.secondaryPlanningAuthority.assertions.hasSelectedRadioButton(
			journey.hasSecondaryLocalPlanningAuthority
		);

		await this.clickContinue();

		if (journey.hasSecondaryLocalPlanningAuthority === 'yes') {
			// Which secondary local planning authority is this application related to?
			// Which secondary local planning authority is this pre-application advice related to?
			await this.pageManager.whichPlanningAuthority.assertions.isPageDisplayed({
				variant: journey.variant,
				WhichPlanningAuthorityType: 'secondary',
				pageValidation
			});

			answers.secondaryLocalPlanningAuthority = await this.selectRandomPlanningAuthority(
				'secondaryLpaId',
				answers.localPlanningAuthority
			);

			await this.pageManager.whichPlanningAuthority.assertions.hasPlanningAuthorityValue(
				answers.secondaryLocalPlanningAuthority,
				{
					WhichPlanningAuthorityType: 'secondary'
				}
			);

			await this.clickContinue();

			// What are the secondary LPA's contact details?
			await this.pageManager.lpaContactDetail.assertions.isPageDisplayed({
				localPlanningAuthorityContactDetailsType: 'secondary',
				pageValidation
			});

			answers.secondaryLpaContactDetails =
				await this.pageManager.lpaContactDetail.secondaryContactDetails.actions.enterGeneratedContactDetails(
					journey.secondaryLpaContactDetails
				);

			await this.pageManager.lpaContactDetail.secondaryContactDetails.assertions.hasContactDetailsValues(
				answers.secondaryLpaContactDetails
			);

			await this.clickContinue();
		}

		// Is the applicant using an agent?
		await this.pageManager.applicantUsingAgent.assertions.isPageDisplayed({
			pageValidation
		});

		await this.pageManager.applicantUsingAgent.actions.selectApplicantUsingAgent(journey.hasAgent);
		await this.pageManager.applicantUsingAgent.assertions.hasSelectedRadioButton(journey.hasAgent);
		await this.clickContinue();

		if (journey.hasAgent === 'yes') {
			// What is the name of the agent organisation?
			await this.pageManager.agentOrganisationName.assertions.isPageDisplayed({
				pageValidation
			});

			answers.agentOrganisationName = await this.pageManager.agentOrganisationName.actions.enterAgentOrganisationName(
				journey.agentOrganisationName
			);

			await this.pageManager.agentOrganisationName.assertions.hasAgentOrganisationNameValue(
				answers.agentOrganisationName
			);

			await this.clickContinue();

			// What is the address of the agent organisation?
			await this.pageManager.agentOrganisationAddress.assertions.isPageDisplayed({
				pageValidation
			});

			answers.agentOrganisationAddress = await this.pageManager.agentOrganisationAddress.address.actions.enterAddress();

			await this.pageManager.agentOrganisationAddress.address.assertions.hasAddressValues(
				answers.agentOrganisationAddress
			);

			await this.clickContinue();
		}

		const capturedAnswers = this.toCapturedAnswers(answers);

		// Check your answers
		await this.pageManager.checkAnswers.assertions.isPageDisplayed({
			expectedTitle: CHECK_YOUR_ANSWERS_TITLE,
			pageValidation
		});

		if (validateCheckAnswers) {
			await this.validateCheckAnswers(capturedAnswers);
		}

		return capturedAnswers;
	}

	private async selectRandomPlanningAuthority(
		inputId: 'lpaId' | 'secondaryLpaId',
		excludedPlanningAuthority?: string
	): Promise<string> {
		await this.pageManager.listbox(inputId).actions.openOptions(' ');

		const options = this.page.locator(`[id^="${inputId}__option--"]`);
		const count = await options.count();

		if (count === 0) {
			throw new Error(`Environment requires at least one option for '${inputId}'`);
		}

		const availableOptions: string[] = [];

		for (let index = 0; index < count; index++) {
			const optionText = (await options.nth(index).innerText()).trim();

			if (optionText && optionText !== excludedPlanningAuthority) {
				availableOptions.push(optionText);
			}
		}

		if (availableOptions.length === 0) {
			throw new Error(
				[
					`Environment requires at least one different planning authority for '${inputId}'`,
					`Excluded planning authority: '${excludedPlanningAuthority}'`
				].join('\n')
			);
		}

		const randomIndex = randomInt(availableOptions.length);
		const selectedPlanningAuthority = availableOptions[randomIndex];

		if (!selectedPlanningAuthority) {
			throw new Error(`Unable to select a planning authority from '${availableOptions.length}' available option(s)`);
		}

		await this.pageManager.listbox(inputId).actions.selectDropListOption('specific', selectedPlanningAuthority);

		return selectedPlanningAuthority;
	}

	private toCapturedAnswers(answers: Partial<CreateCaseCapturedAnswers>): CreateCaseCapturedAnswers {
		if (!answers.journeyName) {
			throw new Error('Create case answers missing journeyName');
		}

		if (!answers.applicationStage) {
			throw new Error('Create case answers missing applicationStage');
		}

		if (!answers.applicationType) {
			throw new Error('Create case answers missing applicationType');
		}

		if (!answers.localPlanningAuthority) {
			throw new Error('Create case answers missing localPlanningAuthority');
		}

		if (!answers.lpaContactDetails) {
			throw new Error('Create case answers missing lpaContactDetails');
		}

		if (!answers.hasSecondaryLocalPlanningAuthority) {
			throw new Error('Create case answers missing hasSecondaryLocalPlanningAuthority');
		}

		if (!answers.hasAgent) {
			throw new Error('Create case answers missing hasAgent');
		}

		return {
			journeyName: answers.journeyName,
			applicationStage: answers.applicationStage,
			applicationClassification: answers.applicationClassification,
			applicationType: answers.applicationType,
			localPlanningAuthority: answers.localPlanningAuthority,
			lpaContactDetails: answers.lpaContactDetails,
			hasSecondaryLocalPlanningAuthority: answers.hasSecondaryLocalPlanningAuthority,
			secondaryLocalPlanningAuthority: answers.secondaryLocalPlanningAuthority,
			secondaryLpaContactDetails: answers.secondaryLpaContactDetails,
			hasAgent: answers.hasAgent,
			agentOrganisationName: answers.agentOrganisationName,
			agentOrganisationAddress: answers.agentOrganisationAddress
		};
	}

	private async validateCheckAnswers(answers: CreateCaseCapturedAnswers): Promise<void> {
		await this.pageManager.checkAnswers.assertions.hasRowValues(
			CHECK_YOUR_ANSWERS_ROWS.applicationStage.key,
			answers.applicationStage,
			{
				actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.applicationStage.actionHrefContains
			}
		);

		if (answers.applicationClassification) {
			await this.pageManager.checkAnswers.assertions.hasRowValues(
				CHECK_YOUR_ANSWERS_ROWS.applicationClassification.key,
				answers.applicationClassification,
				{
					actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.applicationClassification.actionHrefContains
				}
			);
		}

		await this.pageManager.checkAnswers.assertions.hasRowValues(
			CHECK_YOUR_ANSWERS_ROWS.applicationType.key,
			answers.applicationType,
			{
				actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.applicationType.actionHrefContains
			}
		);

		await this.pageManager.checkAnswers.assertions.hasRowValues(
			CHECK_YOUR_ANSWERS_ROWS.localPlanningAuthority.key,
			answers.localPlanningAuthority,
			{
				actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.localPlanningAuthority.actionHrefContains
			}
		);

		await this.pageManager.checkAnswers.assertions.hasRowValues(
			CHECK_YOUR_ANSWERS_ROWS.lpaContactDetails.key,
			[
				answers.lpaContactDetails.firstName,
				answers.lpaContactDetails.lastName,
				answers.lpaContactDetails.email,
				answers.lpaContactDetails.telephoneNumber
			],
			{
				actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.lpaContactDetails.actionHrefContains
			}
		);

		await this.pageManager.checkAnswers.assertions.hasRowValues(
			CHECK_YOUR_ANSWERS_ROWS.hasSecondaryLocalPlanningAuthority.key,
			answers.hasSecondaryLocalPlanningAuthority,
			{
				actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.hasSecondaryLocalPlanningAuthority.actionHrefContains
			}
		);

		if (answers.secondaryLocalPlanningAuthority) {
			await this.pageManager.checkAnswers.assertions.hasRowValues(
				CHECK_YOUR_ANSWERS_ROWS.secondaryLocalPlanningAuthority.key,
				answers.secondaryLocalPlanningAuthority,
				{
					actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.secondaryLocalPlanningAuthority.actionHrefContains
				}
			);
		}

		if (answers.secondaryLpaContactDetails) {
			await this.pageManager.checkAnswers.assertions.hasRowValues(
				CHECK_YOUR_ANSWERS_ROWS.secondaryLpaContactDetails.key,
				[
					answers.secondaryLpaContactDetails.firstName,
					answers.secondaryLpaContactDetails.lastName,
					answers.secondaryLpaContactDetails.email,
					answers.secondaryLpaContactDetails.telephoneNumber
				],
				{
					actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.secondaryLpaContactDetails.actionHrefContains
				}
			);
		}

		await this.pageManager.checkAnswers.assertions.hasRowValues(
			CHECK_YOUR_ANSWERS_ROWS.hasAgent.key,
			answers.hasAgent,
			{
				actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.hasAgent.actionHrefContains
			}
		);

		if (answers.agentOrganisationName) {
			await this.pageManager.checkAnswers.assertions.hasRowValues(
				CHECK_YOUR_ANSWERS_ROWS.agentOrganisationName.key,
				answers.agentOrganisationName,
				{
					actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.agentOrganisationName.actionHrefContains
				}
			);
		}

		if (answers.agentOrganisationAddress) {
			await this.pageManager.checkAnswers.assertions.hasRowValues(
				CHECK_YOUR_ANSWERS_ROWS.agentOrganisationAddress.key,
				[
					answers.agentOrganisationAddress.line1,
					answers.agentOrganisationAddress.line2,
					answers.agentOrganisationAddress.town,
					answers.agentOrganisationAddress.county,
					answers.agentOrganisationAddress.postcode
				],
				{
					actionHrefContains: CHECK_YOUR_ANSWERS_ROWS.agentOrganisationAddress.actionHrefContains
				}
			);
		}
	}

	private async clickContinue(): Promise<void> {
		await this.pageManager.common.actions.clickActionButton('continue');
	}
}

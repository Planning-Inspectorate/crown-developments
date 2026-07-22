import { randomInt } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

import { generateRandomString } from '../page-utilities/generate.utility.ts';
import { type ContactDetailsComponent } from '../page-components/contact-details.component.ts';
import { PageManager } from '../page-objects/page-manager.index.ts';
import { msLogin } from '../page-utilities/microsoft-login.utility.ts';

type PlanningAuthorityInputId = 'lpaId' | 'secondaryLpaId';

const CREATE_CASE_START_URL = '/s62a/cases/create-a-case/questions/pre-application-or-application';
const CHECK_YOUR_ANSWERS_TITLE = 'Check your answers';

const VALIDATION_JOURNEY = {
	variant: 'application',
	applicationClassification: 'nonMajor',
	applicationType: 'planningPermission',
	hasSecondaryLocalPlanningAuthority: 'yes',
	hasAgent: 'yes'
} as const;

/**
 * Selects a random planning authority.
 *
 * An existing authority can be excluded so the secondary authority
 * is different from the primary authority.
 */
async function selectRandomPlanningAuthority(
	page: Page,
	pageManager: PageManager,
	inputId: PlanningAuthorityInputId,
	excludedPlanningAuthority?: string
): Promise<string> {
	await pageManager.listbox(inputId).actions.openOptions(' ');

	const options = page.locator(`[id^="${inputId}__option--"]`);
	const count = await options.count();

	if (count === 0) {
		throw new Error(`No planning authority options were found for '${inputId}'`);
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
				`No available planning authority was found for '${inputId}'`,
				`Excluded planning authority: '${excludedPlanningAuthority}'`
			].join('\n')
		);
	}

	const randomIndex = randomInt(availableOptions.length);
	const selectedPlanningAuthority = availableOptions[randomIndex];

	if (!selectedPlanningAuthority) {
		throw new Error(`Unable to select a planning authority from ${availableOptions.length} available option(s)`);
	}

	await pageManager.listbox(inputId).actions.selectDropListOption('specific', selectedPlanningAuthority);

	return selectedPlanningAuthority;
}

/**
 * Verifies the supported LPA contact-details validation errors,
 * then enters valid generated contact details and continues.
 */
async function validateLpaContactDetailsErrors(
	pageManager: PageManager,
	contactDetails: ContactDetailsComponent
): Promise<void> {
	await test.step('Required contact detail errors', async () => {
		await pageManager.common.actions.clickActionButton('continue');
		await contactDetails.assertions.isErrorDisplayed(['firstNameRequired', 'lastNameRequired', 'emailRequired']);
	});

	await test.step('Invalid contact detail errors', async () => {
		const invalidFirstName = generateRandomString(20, {
			requiredSpecialWords: ['@']
		});
		const invalidLastName = generateRandomString(20, {
			requiredSpecialWords: ['#']
		});
		const invalidEmail = 'test@example';
		const invalidTelephoneNumber = generateRandomString(10).replace(/[^a-zA-Z]/g, 'x');

		await contactDetails.actions.enterContactDetails({
			firstName: invalidFirstName,
			lastName: invalidLastName,
			email: invalidEmail,
			telephoneNumber: invalidTelephoneNumber
		});
		await pageManager.common.actions.clickActionButton('continue');
		await contactDetails.assertions.isErrorDisplayed([
			'firstNameInvalidCharacters',
			'lastNameInvalidCharacters',
			'emailInvalid',
			'telephoneNumberInvalid'
		]);
	});

	await test.step('Contact detail maximum-length errors', async () => {
		const firstNameTooLong = generateRandomString(251).replace(/[^a-zA-Z\s'-]/g, 'a');
		const lastNameTooLong = generateRandomString(251).replace(/[^a-zA-Z\s'-]/g, 'b');
		const telephoneNumberTooLong = generateRandomString(16).replace(/\D/g, '1');

		await contactDetails.actions.enterContactDetails({
			firstName: firstNameTooLong,
			lastName: lastNameTooLong,
			telephoneNumber: telephoneNumberTooLong
		});
		await pageManager.common.actions.clickActionButton('continue');
		await contactDetails.assertions.isErrorDisplayed([
			'firstNameTooLong',
			'lastNameTooLong',
			'emailRequired',
			'telephoneNumberTooLong'
		]);
	});

	await test.step('Enter valid generated contact details', async () => {
		const validContactDetails = await contactDetails.actions.enterGeneratedContactDetails();

		await contactDetails.assertions.hasContactDetailsValues(validContactDetails);
		await pageManager.common.actions.clickActionButton('continue');
	});
}

test.beforeEach(async ({ page }) => {
	await msLogin(page);
});

test.describe('S62A > Create case validation errors', { tag: '@regression' }, () => {
	test('shows validation errors before continuing', async ({ page }) => {
		const pageManager = new PageManager(page);

		await page.goto(CREATE_CASE_START_URL);

		let primaryPlanningAuthority = '';

		await test.step('Application stage required error', async () => {
			await pageManager.applicationStage.assertions.isPageDisplayed({
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.applicationStage.assertions.isErrorDisplayed();
			await pageManager.applicationStage.actions.selectApplicationStage(VALIDATION_JOURNEY.variant);
			await pageManager.applicationStage.assertions.hasSelectedRadioButton(VALIDATION_JOURNEY.variant);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Application classification required error', async () => {
			await pageManager.applicationClassification.assertions.isPageDisplayed({
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.applicationClassification.assertions.isErrorDisplayed();
			await pageManager.applicationClassification.actions.selectApplicationClassification(
				VALIDATION_JOURNEY.applicationClassification
			);
			await pageManager.applicationClassification.assertions.hasSelectedRadioButton(
				VALIDATION_JOURNEY.applicationClassification
			);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Application type required error', async () => {
			await pageManager.applicationType.assertions.isPageDisplayed({
				variant: VALIDATION_JOURNEY.variant,
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.applicationType.assertions.isErrorDisplayed();
			await pageManager.applicationType.actions.selectApplicationType(VALIDATION_JOURNEY.applicationType);
			await pageManager.applicationType.assertions.hasSelectedRadioButton(VALIDATION_JOURNEY.applicationType);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Primary planning authority required error', async () => {
			await pageManager.whichPlanningAuthority.assertions.isPageDisplayed({
				variant: VALIDATION_JOURNEY.variant,
				whichPlanningAuthorityType: 'primary',
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.whichPlanningAuthority.assertions.isErrorDisplayed({
				whichPlanningAuthorityType: 'primary'
			});

			primaryPlanningAuthority = await selectRandomPlanningAuthority(page, pageManager, 'lpaId');

			await pageManager.whichPlanningAuthority.assertions.hasPlanningAuthorityValue(primaryPlanningAuthority);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Primary LPA contact details validation', async () => {
			await pageManager.lpaContactDetail.assertions.isPageDisplayed({
				localPlanningAuthorityContactDetailsType: 'primary',
				pageValidation: 'basicValidation'
			});
			await validateLpaContactDetailsErrors(pageManager, pageManager.lpaContactDetail.contactDetails);
		});

		await test.step('Secondary planning authority question required error', async () => {
			await pageManager.secondaryPlanningAuthority.assertions.isPageDisplayed({
				variant: VALIDATION_JOURNEY.variant,
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.secondaryPlanningAuthority.assertions.isErrorDisplayed();
			await pageManager.secondaryPlanningAuthority.actions.selectSecondaryLPAOption(
				VALIDATION_JOURNEY.hasSecondaryLocalPlanningAuthority
			);
			await pageManager.secondaryPlanningAuthority.assertions.hasSelectedRadioButton(
				VALIDATION_JOURNEY.hasSecondaryLocalPlanningAuthority
			);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Secondary planning authority required error', async () => {
			await pageManager.whichPlanningAuthority.assertions.isPageDisplayed({
				variant: VALIDATION_JOURNEY.variant,
				whichPlanningAuthorityType: 'secondary',
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.whichPlanningAuthority.assertions.isErrorDisplayed({
				whichPlanningAuthorityType: 'secondary'
			});

			const secondaryPlanningAuthority = await selectRandomPlanningAuthority(
				page,
				pageManager,
				'secondaryLpaId',
				primaryPlanningAuthority
			);

			await pageManager.whichPlanningAuthority.assertions.hasPlanningAuthorityValue(secondaryPlanningAuthority, {
				whichPlanningAuthorityType: 'secondary'
			});
			expect(secondaryPlanningAuthority).not.toBe(primaryPlanningAuthority);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Secondary LPA contact details validation', async () => {
			await pageManager.lpaContactDetail.assertions.isPageDisplayed({
				localPlanningAuthorityContactDetailsType: 'secondary',
				pageValidation: 'basicValidation'
			});
			await validateLpaContactDetailsErrors(pageManager, pageManager.lpaContactDetail.secondaryContactDetails);
		});

		await test.step('Applicant using an agent required error', async () => {
			await pageManager.applicantUsingAgent.assertions.isPageDisplayed({
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.applicantUsingAgent.assertions.isErrorDisplayed();
			await pageManager.applicantUsingAgent.actions.selectApplicantUsingAgent(VALIDATION_JOURNEY.hasAgent);
			await pageManager.applicantUsingAgent.assertions.hasSelectedRadioButton(VALIDATION_JOURNEY.hasAgent);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Agent organisation name validation', async () => {
			const organisationNameTooLong = generateRandomString(251).replace(/[^a-zA-Z0-9\s,'-]/g, 'a');
			const organisationNameInvalidCharacters = generateRandomString(20, {
				requiredSpecialWords: ['@']
			});

			await pageManager.agentOrganisationName.assertions.isPageDisplayed({
				pageValidation: 'basicValidation'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.agentOrganisationName.assertions.isErrorDisplayed('required');
			await pageManager.agentOrganisationName.actions.enterAgentOrganisationName(organisationNameTooLong);
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.agentOrganisationName.assertions.isErrorDisplayed('tooLong');
			await pageManager.agentOrganisationName.actions.enterAgentOrganisationName(organisationNameInvalidCharacters);
			await pageManager.common.actions.clickActionButton('continue');
			await pageManager.agentOrganisationName.assertions.isErrorDisplayed('invalidCharacters');

			const validOrganisationName = await pageManager.agentOrganisationName.actions.enterAgentOrganisationName();

			await pageManager.agentOrganisationName.assertions.hasAgentOrganisationNameValue(validOrganisationName);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Agent organisation address validation', async () => {
			const addressComponent = pageManager.agentOrganisationAddress.address;
			const over250Characters = generateRandomString(251);

			await pageManager.agentOrganisationAddress.assertions.isPageDisplayed({
				pageValidation: 'basicValidation'
			});
			await addressComponent.actions.enterAddress({
				postcode: 'bAdP0stCode'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await addressComponent.assertions.isErrorDisplayed('postcodeLength');
			await addressComponent.actions.enterAddress({
				postcode: 'u4852fw'
			});
			await pageManager.common.actions.clickActionButton('continue');
			await addressComponent.assertions.isErrorDisplayed('invalidPostcodeFormat');
			await addressComponent.actions.enterAddress({
				postcode: ''
			});
			await addressComponent.actions.enterAddress({
				line1: over250Characters
			});
			await pageManager.common.actions.clickActionButton('continue');
			await addressComponent.assertions.isErrorDisplayed('line1TooLong');
			await addressComponent.actions.enterAddress({
				line1: over250Characters,
				county: over250Characters
			});
			await pageManager.common.actions.clickActionButton('continue');
			await addressComponent.assertions.isErrorDisplayed(['line1TooLong', 'countyTooLong']);
			await addressComponent.actions.enterAddress({
				line1: '',
				county: '',
				town: over250Characters
			});
			await pageManager.common.actions.clickActionButton('continue');
			await addressComponent.assertions.isErrorDisplayed('townTooLong');
			await addressComponent.actions.enterAddress({
				town: ''
			});

			const address = await addressComponent.actions.enterAddress();

			await addressComponent.assertions.hasAddressValues(address);
			await pageManager.common.actions.clickActionButton('continue');
		});

		await test.step('Check your answers page is displayed', async () => {
			await pageManager.checkAnswers.assertions.isPageDisplayed({
				expectedTitle: CHECK_YOUR_ANSWERS_TITLE,
				pageValidation: 'basicValidation'
			});
			await expect(page.locator('h1')).toContainText(CHECK_YOUR_ANSWERS_TITLE);
		});
	});
});

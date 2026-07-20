import { expect, test } from '@playwright/test';

import { applicationCreateCaseJourneys } from '../fixtures/application-journeys.ts';
import { PageManager } from '../page-objects/page-manager.index.ts';
import { CreateCaseUtility, type CreateCaseJourneyName } from '../page-utilities/create-case.utility.ts';
import { msLogin } from '../page-utilities/microsoft-login.utility.ts';

const CHECK_YOUR_ANSWERS_TITLE = 'Check your answers';

const BACK_NAVIGATION_JOURNEY_NAME =
	'Application > Non-major > Planning permission > Secondary LPA > Agent' satisfies CreateCaseJourneyName;

const BACK_NAVIGATION_JOURNEY = applicationCreateCaseJourneys.find(
	(journey) => journey.name === BACK_NAVIGATION_JOURNEY_NAME
);

if (!BACK_NAVIGATION_JOURNEY) {
	throw new Error(`Back-navigation journey was not found: '${BACK_NAVIGATION_JOURNEY_NAME}'`);
}

test.use({
	storageState: undefined
});

test.beforeEach(async ({ page }) => {
	const pageManager = new PageManager(page);

	await pageManager.common.actions.clearBrowserState();
	await msLogin(page);
});

test.describe(
	'S62A > Create case back navigation',
	{
		tag: '@regression'
	},
	() => {
		test('retains saved values when navigating back through the create case journey', async ({ page }) => {
			const pageManager = new PageManager(page);
			const createCaseUtility = new CreateCaseUtility(page);

			const answers = await createCaseUtility.createCaseByJourneyName(BACK_NAVIGATION_JOURNEY_NAME, {
				fullValidation: false,
				validateCheckAnswers: true
			});

			await test.step('Check your answers page is displayed', async () => {
				await pageManager.checkAnswers.assertions.isPageDisplayed({
					expectedTitle: CHECK_YOUR_ANSWERS_TITLE,
					pageValidation: 'basicValidation'
				});
				await expect(page.locator('h1')).toContainText(CHECK_YOUR_ANSWERS_TITLE);
			});

			await test.step('Use browser Back to return to agent organisation address', async () => {
				if (!answers.agentOrganisationAddress) {
					throw new Error('Agent organisation address was not captured by the journey');
				}

				await pageManager.common.actions.goBack();
				await pageManager.agentOrganisationAddress.assertions.isPageDisplayed({
					pageValidation: 'basicValidation'
				});
				await pageManager.agentOrganisationAddress.address.assertions.hasAddressValues(
					answers.agentOrganisationAddress
				);
			});

			await test.step('Use Back link to return to agent organisation name', async () => {
				if (!answers.agentOrganisationName) {
					throw new Error('Agent organisation name was not captured by the journey');
				}

				await pageManager.common.actions.clickActionButton('back');
				await pageManager.agentOrganisationName.assertions.isPageDisplayed({
					pageValidation: 'basicValidation'
				});
				await pageManager.agentOrganisationName.assertions.hasAgentOrganisationNameValue(answers.agentOrganisationName);
			});

			await test.step('Use Back link to return to applicant using agent', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.applicantUsingAgent.assertions.isPageDisplayed({
					pageValidation: 'basicValidation'
				});
				await pageManager.applicantUsingAgent.assertions.hasSelectedRadioButton(BACK_NAVIGATION_JOURNEY.hasAgent);
			});

			await test.step('Use Back link to return to secondary LPA contact details', async () => {
				if (!answers.secondaryLpaContactDetails) {
					throw new Error('Secondary LPA contact details were not captured by the journey');
				}

				await pageManager.common.actions.clickActionButton('back');
				await pageManager.lpaContactDetail.assertions.isPageDisplayed({
					localPlanningAuthorityContactDetailsType: 'secondary',
					pageValidation: 'basicValidation'
				});
				await pageManager.lpaContactDetail.secondaryContactDetails.assertions.hasContactDetailsValues(
					answers.secondaryLpaContactDetails
				);
			});

			await test.step('Use Back link to return to secondary planning authority', async () => {
				if (!answers.secondaryLocalPlanningAuthority) {
					throw new Error('Secondary planning authority was not captured by the journey');
				}

				await pageManager.common.actions.clickActionButton('back');
				await pageManager.whichPlanningAuthority.assertions.isPageDisplayed({
					variant: BACK_NAVIGATION_JOURNEY.variant,
					WhichPlanningAuthorityType: 'secondary',
					pageValidation: 'basicValidation'
				});
				await pageManager.whichPlanningAuthority.assertions.hasPlanningAuthorityValue(
					answers.secondaryLocalPlanningAuthority,
					{
						WhichPlanningAuthorityType: 'secondary'
					}
				);
			});

			await test.step('Use Back link to return to secondary LPA question', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.secondaryPlanningAuthority.assertions.isPageDisplayed({
					variant: BACK_NAVIGATION_JOURNEY.variant,
					pageValidation: 'basicValidation'
				});
				await pageManager.secondaryPlanningAuthority.assertions.hasSelectedRadioButton(
					BACK_NAVIGATION_JOURNEY.hasSecondaryLocalPlanningAuthority
				);
			});

			await test.step('Use Back link to return to primary LPA contact details', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.lpaContactDetail.assertions.isPageDisplayed({
					localPlanningAuthorityContactDetailsType: 'primary',
					pageValidation: 'basicValidation'
				});
				await pageManager.lpaContactDetail.contactDetails.assertions.hasContactDetailsValues(answers.lpaContactDetails);
			});

			await test.step('Use Back link to return to primary planning authority', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.whichPlanningAuthority.assertions.isPageDisplayed({
					variant: BACK_NAVIGATION_JOURNEY.variant,
					WhichPlanningAuthorityType: 'primary',
					pageValidation: 'basicValidation'
				});
				await pageManager.whichPlanningAuthority.assertions.hasPlanningAuthorityValue(answers.localPlanningAuthority);
			});

			await test.step('Use Back link to return to application type', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.applicationType.assertions.isPageDisplayed({
					variant: BACK_NAVIGATION_JOURNEY.variant,
					pageValidation: 'basicValidation'
				});
				await pageManager.applicationType.assertions.hasSelectedRadioButton(BACK_NAVIGATION_JOURNEY.applicationType);
			});

			await test.step('Use Back link to return to application classification', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.applicationClassification.assertions.isPageDisplayed({
					pageValidation: 'basicValidation'
				});
				await pageManager.applicationClassification.assertions.hasSelectedRadioButton(
					BACK_NAVIGATION_JOURNEY.applicationClassification
				);
			});

			await test.step('Use Back link to return to application stage', async () => {
				await pageManager.common.actions.clickActionButton('back');
				await pageManager.applicationStage.assertions.isPageDisplayed({
					pageValidation: 'basicValidation'
				});
				await pageManager.applicationStage.assertions.hasSelectedRadioButton(BACK_NAVIGATION_JOURNEY.variant);
				await expect(page).toHaveURL(/pre-application-or-application/);
			});
		});
	}
);

import { expect, test } from '@playwright/test';
import { PageManager } from '../page-objects/page-manager.index.ts';
import { applicationCreateCaseJourneys } from '../fixtures/application-journeys.ts';
import { preApplicationCreateCaseJourneys } from '../fixtures/pre-application-journeys.ts';
import { CreateCaseUtility, type CreateCaseJourneyName } from '../page-utilities/create-case.utility.ts';
import { msLogin } from '../page-utilities/microsoft-login.utility.ts';
import { type CreateCaseJourney } from '../types/create-case-journey.type.ts';

type JourneyTag = CreateCaseJourney['tags'][number];

const CHECK_YOUR_ANSWERS_TITLE = 'Check your answers';

const allJourneys: readonly CreateCaseJourney[] = [
	...preApplicationCreateCaseJourneys,
	...applicationCreateCaseJourneys
];

const VALID_JOURNEY_TAGS: readonly JourneyTag[] = ['smoke', 'regression'];

/**
 * Do not use the globally saved authenticated storage state for this spec.
 *
 * The create-case journey appears to keep form/session state between tests
 * when the same saved auth session is reused.
 *
 * This makes each journey start from a clean browser context and log in fresh.
 */
test.use({
	storageState: undefined
});

/**
 * Local development filters for quickly rerunning specific journeys/tags.
 *
 * Leave both arrays empty to run the full suite.
 *
 * Examples:
 *
 * Run one journey:
 * - Add a single journey name to LOCAL_RUN_JOURNEYS.
 *
 * Run multiple journeys:
 * - Add multiple journey names to LOCAL_RUN_JOURNEYS.
 *
 * Run smoke journeys:
 * - Leave LOCAL_RUN_JOURNEYS empty.
 * - Add 'smoke' to LOCAL_RUN_TAGS.
 *
 * Run regression journeys:
 * - Leave LOCAL_RUN_JOURNEYS empty.
 * - Add 'regression' to LOCAL_RUN_TAGS.
 *
 * Environment variable examples:
 * - JOURNEY_NAMES="Pre-application > Planning permission > No secondary LPA > No agent" npx playwright test
 * - JOURNEY_TAGS="smoke" npx playwright test
 */
const LOCAL_RUN_JOURNEYS: CreateCaseJourneyName[] = [
	// 'Pre-application > Planning permission > No secondary LPA > No agent',
	// 'Application > Major > Planning permission > No secondary LPA > No agent'
];

const LOCAL_RUN_TAGS: JourneyTag[] = [
	// 'smoke',
	// 'regression'
];

function parseEnvironmentList(value: string | undefined): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function isJourneyName(value: string): value is CreateCaseJourneyName {
	return allJourneys.some((journey) => journey.name === value);
}

function isJourneyTag(value: string): value is JourneyTag {
	return VALID_JOURNEY_TAGS.includes(value as JourneyTag);
}

function getEnvironmentJourneyNames(): CreateCaseJourneyName[] {
	const journeyNames = parseEnvironmentList(process.env.JOURNEY_NAMES);

	const invalidJourneyNames = journeyNames.filter((journeyName) => !isJourneyName(journeyName));

	if (invalidJourneyNames.length > 0) {
		throw new Error(`Unknown journey name(s): ${invalidJourneyNames.join(', ')}`);
	}

	return journeyNames.filter(isJourneyName);
}

function getEnvironmentJourneyTags(): JourneyTag[] {
	const journeyTags = parseEnvironmentList(process.env.JOURNEY_TAGS);

	const invalidJourneyTags = journeyTags.filter((journeyTag) => !isJourneyTag(journeyTag));

	if (invalidJourneyTags.length > 0) {
		throw new Error(`Unknown journey tag(s): ${invalidJourneyTags.join(', ')}`);
	}

	return journeyTags.filter(isJourneyTag);
}

const ENVIRONMENT_RUN_JOURNEYS = getEnvironmentJourneyNames();
const ENVIRONMENT_RUN_TAGS = getEnvironmentJourneyTags();

const RUN_JOURNEYS = ENVIRONMENT_RUN_JOURNEYS.length > 0 ? ENVIRONMENT_RUN_JOURNEYS : LOCAL_RUN_JOURNEYS;
const RUN_TAGS = ENVIRONMENT_RUN_TAGS.length > 0 ? ENVIRONMENT_RUN_TAGS : LOCAL_RUN_TAGS;

/**
 * Prevent accidental commits of local filters.
 * Environment variable filters are allowed in CI.
 */
if (process.env.CI && (LOCAL_RUN_JOURNEYS.length > 0 || LOCAL_RUN_TAGS.length > 0)) {
	throw new Error('LOCAL_RUN_JOURNEYS or LOCAL_RUN_TAGS contains values. Clear local filters before running in CI.');
}

/**
 * Determines whether a journey should run based on
 * journey name filters and tag filters.
 */
function shouldRunJourney(journey: CreateCaseJourney): boolean {
	const matchesJourneyName = RUN_JOURNEYS.length === 0 || RUN_JOURNEYS.includes(journey.name as CreateCaseJourneyName);
	const matchesTag = RUN_TAGS.length === 0 || journey.tags.some((tag) => RUN_TAGS.includes(tag));

	return matchesJourneyName && matchesTag;
}

/**
 * Final filtered list of journeys to execute.
 */
const journeysToRun = allJourneys.filter(shouldRunJourney);

if (journeysToRun.length === 0) {
	throw new Error('No create case journeys matched the current filters.');
}

test.beforeEach(async ({ page }) => {
	const pageManager = new PageManager(page);

	await pageManager.common.actions.clearBrowserState();
	await msLogin(page);
});

test.describe('S62A > Create case journeys', () => {
	for (const journey of journeysToRun) {
		test(`Create Case: ${journey.name} ${journey.tags.map((tag) => `@${tag}`).join(' ')}`, async ({ page }) => {
			const createCaseUtility = new CreateCaseUtility(page);
			const answers = await createCaseUtility.createCaseByJourneyName(journey.name as CreateCaseJourneyName, {
				fullValidation: true,
				validateCheckAnswers: true
			});

			await expect(page.locator('h1')).toContainText(CHECK_YOUR_ANSWERS_TITLE);

			expect(answers.localPlanningAuthority).toBeTruthy();

			if (answers.secondaryLocalPlanningAuthority) {
				expect(answers.secondaryLocalPlanningAuthority).not.toBe(answers.localPlanningAuthority);
			}
		});
	}
});

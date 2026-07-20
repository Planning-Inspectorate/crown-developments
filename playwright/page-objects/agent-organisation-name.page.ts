import { randomInt } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { AGENT_ORGANISATION_NAME } from '../page-strings/create-case.strings.ts';
import { type PageDisplayOptions } from '../types/page-options.type.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.agentOrganisationName;

export type AgentOrganisationNameErrorType = keyof typeof AGENT_ORGANISATION_NAME.errors;

const DEFAULT_AGENT_ORGANISATIONS = [
	'Greenfield Planning Consultancy',
	'Northgate Architectural Services',
	'Harbour Planning Associates',
	'Willow Brook Design Studio',
	'Pioneer Town Planning',
	'Oakham Development Consultancy',
	'Blue Ridge Architecture',
	'Brook Lane Planning Services',
	'Westfield Land Consultants',
	'Church Road Design Partnership',
	'Mill Farm Planning Group',
	'Teddington Urban Design',
	'Seaford Head Planning Ltd',
	'Longford Architectural Practice',
	'Station Road Planning Consultants',
	'Anglian Development Services',
	'Estuary Planning Partnership',
	'Little Waltham Design Company',
	'Harbury Planning and Design',
	'National Trust Land Consultants'
] as const;

export class AgentOrganisationNamePage {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
	}

	private readonly locators = {
		agentOrganisationNameInput: () => this.page.locator('#agentName')
	};

	private getRandomAgentOrganisationName(): string {
		const randomIndex = randomInt(DEFAULT_AGENT_ORGANISATIONS.length);
		const organisationName = DEFAULT_AGENT_ORGANISATIONS[randomIndex];

		if (!organisationName) {
			throw new Error('Unable to select an agent organisation name');
		}

		return organisationName;
	}

	public readonly actions = {
		/**
		 * Enters an agent organisation name.
		 * A random valid organisation name is generated when no value is supplied.
		 */
		enterAgentOrganisationName: async (agentOrganisationName?: string): Promise<string> => {
			const valueToUse = agentOrganisationName ?? this.getRandomAgentOrganisationName();
			const input = this.locators.agentOrganisationNameInput();

			await expect(input, 'Agent organisation name input should be visible').toBeVisible();
			await input.fill(valueToUse);
			await expect(input).toHaveValue(valueToUse);

			return valueToUse;
		},

		/**
		 * Clears the agent organisation name input.
		 */
		clearAgentOrganisationName: async () => {
			const input = this.locators.agentOrganisationNameInput();

			await expect(input, 'Agent organisation name input should be visible before clearing').toBeVisible();
			await input.clear();
			await expect(input).toHaveValue('');

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the agent organisation name page is displayed.
		 * Full validation also checks URL, label, hint, input, back link, and continue button.
		 */
		isPageDisplayed: async (options: PageDisplayOptions = {}) => {
			const { pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(AGENT_ORGANISATION_NAME.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(AGENT_ORGANISATION_NAME.title, {
						timeout
					});
				},
				async () => {
					await expect(
						this.page.locator('label[for="agentName"]', {
							hasText: AGENT_ORGANISATION_NAME.title
						}),
						'Agent organisation name label should be visible'
					).toBeVisible({
						timeout
					});
					await expect(
						this.page.locator('#agentName-hint'),
						'Agent organisation name hint should be visible'
					).toContainText(AGENT_ORGANISATION_NAME.hint, {
						timeout
					});

					const input = this.locators.agentOrganisationNameInput();

					await expect(input, 'Agent organisation name input should be visible').toBeVisible({
						timeout
					});
					await expect(input).toHaveAttribute('name', 'agentName');
					await expect(input).toHaveAttribute('type', 'text');
					await expect(input).toHaveAttribute('aria-describedby', /(^|\s)agentName-hint(\s|$)/);
					await this.commonComponent.assertions.checkActionExists('back', {
						timeout
					});
					await this.commonComponent.assertions.checkActionExists('continue', {
						timeout
					});
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies the selected agent organisation name validation error.
		 */
		isErrorDisplayed: async (
			errorType: AgentOrganisationNameErrorType,
			options: Pick<PageDisplayOptions, 'timeout'> = {}
		) => {
			const timeout = options.timeout ?? DEFAULT_TIMEOUT;
			const error = AGENT_ORGANISATION_NAME.errors[errorType];

			await this.commonComponent.assertions.verifyErrorSummary(error.message, {
				href: error.href,
				inlineId: error.inlineId,
				timeout
			});

			return this.assertions;
		},

		/**
		 * Verifies the agent organisation name input value.
		 */
		hasAgentOrganisationNameValue: async (expectedValue: string) => {
			await expect(this.locators.agentOrganisationNameInput()).toHaveValue(expectedValue);

			return this.assertions;
		}
	};
}

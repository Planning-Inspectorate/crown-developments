import { type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { RadioGroupComponent } from '../page-components/radio-group.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { APPLICANT_USING_AGENT } from '../page-strings/create-case.strings.ts';
import { type PageDisplayOptions } from '../types/page-options.type.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.applicantUsingAgent;

export type ApplicantUsingAgentOption = 'yes' | 'no';

export class ApplicantUsingAgentPage {
	private readonly commonComponent: CommonComponent;
	private readonly applicantUsingAgentRadioGroup: RadioGroupComponent;

	constructor(page: Page) {
		this.commonComponent = new CommonComponent(page);
		this.applicantUsingAgentRadioGroup = new RadioGroupComponent(page, 'hasAgent');
	}

	private readonly optionTextMap: Record<ApplicantUsingAgentOption, string> = APPLICANT_USING_AGENT.options;

	public readonly actions = {
		/**
		 * Selects whether the applicant is using an agent.
		 */
		selectApplicantUsingAgent: async (option: ApplicantUsingAgentOption) => {
			await this.applicantUsingAgentRadioGroup.actions.selectOptionContaining(this.optionTextMap[option]);

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the applicant using agent page is displayed.
		 * Full validation also checks URL, radio options, back link, and continue button.
		 */
		isPageDisplayed: async (options: PageDisplayOptions = {}) => {
			const { pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(APPLICANT_USING_AGENT.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(APPLICANT_USING_AGENT.title, {
						timeout
					});
				},
				async () => {
					await this.applicantUsingAgentRadioGroup.assertions.hasOptions(Object.values(this.optionTextMap));
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
		 * Verifies the applicant using agent required error.
		 */
		isErrorDisplayed: async () => {
			await this.commonComponent.assertions.verifyErrorSummary(APPLICANT_USING_AGENT.error, {
				href: APPLICANT_USING_AGENT.errorHref,
				inlineId: APPLICANT_USING_AGENT.inlineErrorId
			});

			return this.assertions;
		},

		/**
		 * Verifies the expected applicant using agent option is selected.
		 */
		hasSelectedRadioButton: async (option: ApplicantUsingAgentOption) => {
			await this.applicantUsingAgentRadioGroup.assertions.isOptionSelected(this.optionTextMap[option]);

			return this.assertions;
		}
	};
}

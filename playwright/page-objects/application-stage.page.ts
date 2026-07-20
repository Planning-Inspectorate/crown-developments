import { type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { RadioGroupComponent } from '../page-components/radio-group.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { type PageDisplayOptions, type ApplicationVariant } from '../types/page-options.type.ts';
import { APPLICATION_STAGE } from '../page-strings/create-case.strings.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.applicationStage;

export class ApplicationStagePage {
	private readonly commonComponent: CommonComponent;
	private readonly applicationStageRadioGroup: RadioGroupComponent;

	constructor(page: Page) {
		this.commonComponent = new CommonComponent(page);
		this.applicationStageRadioGroup = new RadioGroupComponent(page, 'applicationStage');
	}

	private readonly optionTextMap: Record<ApplicationVariant, string> = APPLICATION_STAGE.options;

	public readonly actions = {
		/**
		 * Selects the application stage option.
		 */
		selectApplicationStage: async (option: ApplicationVariant) => {
			await this.applicationStageRadioGroup.actions.selectOptionContaining(this.optionTextMap[option]);

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the application stage page is displayed.
		 * Full validation also checks URL, radio options, back link, and continue button.
		 */
		isPageDisplayed: async (options: PageDisplayOptions = {}) => {
			const { pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(APPLICATION_STAGE.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(APPLICATION_STAGE.title, {
						timeout
					});
				},
				async () => {
					await this.commonComponent.assertions.checkActionExists('back', {
						timeout
					});
					await this.applicationStageRadioGroup.assertions.hasOptions(Object.values(this.optionTextMap));
					await this.commonComponent.assertions.checkActionExists('continue', {
						timeout
					});
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies the expected application stage option is selected.
		 */
		hasSelectedRadioButton: async (option: ApplicationVariant) => {
			await this.applicationStageRadioGroup.assertions.isOptionSelected(this.optionTextMap[option]);

			return this.assertions;
		},

		/**
		 * Verifies the application stage required error.
		 */
		isErrorDisplayed: async () => {
			await this.commonComponent.assertions.verifyErrorSummary(APPLICATION_STAGE.error, {
				href: APPLICATION_STAGE.errorHref,
				inlineId: APPLICATION_STAGE.inlineErrorId
			});

			return this.assertions;
		}
	};
}

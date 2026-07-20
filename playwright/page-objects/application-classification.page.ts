import { type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { RadioGroupComponent } from '../page-components/radio-group.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { type PageDisplayOptions } from '../types/page-options.type.ts';
import { APPLICATION_CLASSIFICATION } from '../page-strings/create-case.strings.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.applicationClassification;

export type ApplicationClassificationOption = 'major' | 'nonMajor';

export class ApplicationClassificationPage {
	private readonly commonComponent: CommonComponent;
	private readonly applicationClassificationRadioGroup: RadioGroupComponent;

	constructor(page: Page) {
		this.commonComponent = new CommonComponent(page);
		this.applicationClassificationRadioGroup = new RadioGroupComponent(page, 'applicationClassification');
	}

	private readonly optionTextMap: Record<ApplicationClassificationOption, string> = APPLICATION_CLASSIFICATION.options;

	public readonly actions = {
		/**
		 * Selects the application classification option.
		 */
		selectApplicationClassification: async (option: ApplicationClassificationOption) => {
			await this.applicationClassificationRadioGroup.actions.selectOptionContaining(this.optionTextMap[option]);

			return this.actions;
		}
	};

	public readonly assertions = {
		isPageDisplayed: async (options: PageDisplayOptions = {}) => {
			const { pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(APPLICATION_CLASSIFICATION.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(APPLICATION_CLASSIFICATION.title, {
						timeout
					});
				},
				async () => {
					await this.applicationClassificationRadioGroup.assertions.hasOptions(Object.values(this.optionTextMap));
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
		 * Verifies the expected application classification option is selected.
		 */
		hasSelectedRadioButton: async (option: ApplicationClassificationOption) => {
			await this.applicationClassificationRadioGroup.assertions.isOptionSelected(this.optionTextMap[option]);

			return this.assertions;
		},

		/**
		 * Verifies the application classification required error.
		 */
		isErrorDisplayed: async () => {
			await this.commonComponent.assertions.verifyErrorSummary(APPLICATION_CLASSIFICATION.error, {
				href: APPLICATION_CLASSIFICATION.errorHref,
				inlineId: APPLICATION_CLASSIFICATION.inlineErrorId
			});

			return this.assertions;
		}
	};
}

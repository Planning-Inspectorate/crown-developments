import { type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { RadioGroupComponent } from '../page-components/radio-group.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import type { ApplicationVariant } from '../types/page-options.type.ts';
import { type PageDisplayOptions } from '../types/page-options.type.ts';
import { APPLICATION_TYPE } from '../page-strings/create-case.strings.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.applicationType;

export type ApplicationTypeOption =
	| 'planningPermission'
	| 'outlinePlanningPermissionSomeReserved'
	| 'outlinePlanningPermissionAllReserved'
	| 'approvalOfReservedMatters'
	| 'planningPermissionAndListedBuildingConsent';

type ApplicationTypePageOptions = PageDisplayOptions & {
	variant?: ApplicationVariant;
};

export class ApplicationTypePage {
	private readonly commonComponent: CommonComponent;
	private readonly applicationTypeRadioGroup: RadioGroupComponent;

	constructor(page: Page) {
		this.commonComponent = new CommonComponent(page);
		this.applicationTypeRadioGroup = new RadioGroupComponent(page, 'applicationType');
	}

	private readonly optionTextMap: Record<ApplicationTypeOption, string> = APPLICATION_TYPE.options;

	public readonly actions = {
		/**
		 * Selects the application type option.
		 */
		selectApplicationType: async (option: ApplicationTypeOption) => {
			await this.applicationTypeRadioGroup.actions.selectOption(this.optionTextMap[option]);

			return this.actions;
		}
	};

	public readonly assertions = {
		isPageDisplayed: async (options: ApplicationTypePageOptions = {}) => {
			const { variant = 'application', pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			const pageStrings = APPLICATION_TYPE.pages[variant];

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(pageStrings.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(pageStrings.title, {
						timeout
					});
				},
				async () => {
					await this.applicationTypeRadioGroup.assertions.hasOptions(Object.values(this.optionTextMap));
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
		 * Verifies the expected application type option is selected.
		 */
		hasSelectedRadioButton: async (option: ApplicationTypeOption) => {
			await this.applicationTypeRadioGroup.assertions.isOptionSelected(this.optionTextMap[option]);

			return this.assertions;
		},

		/**
		 * Verifies the application type required error.
		 */
		isErrorDisplayed: async () => {
			await this.commonComponent.assertions.verifyErrorSummary(APPLICATION_TYPE.error, {
				href: APPLICATION_TYPE.errorHref,
				inlineId: APPLICATION_TYPE.inlineErrorId
			});

			return this.assertions;
		}
	};
}

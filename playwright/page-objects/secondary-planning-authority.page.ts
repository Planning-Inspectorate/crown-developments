import { type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { RadioGroupComponent } from '../page-components/radio-group.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { SECONDARY_LOCAL_PLANNING_AUTHORITY } from '../page-strings/create-case.strings.ts';
import { type ApplicationVariant, type PageDisplayOptions } from '../types/page-options.type.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.secondaryPlanningAuthority;

export type SecondaryLocalPlanningAuthorityOption = 'yes' | 'no';

type SecondaryLocalPlanningAuthorityPageOptions = PageDisplayOptions & {
	variant?: ApplicationVariant;
};

export class SecondaryLocalPlanningAuthorityPage {
	private readonly commonComponent: CommonComponent;
	private readonly secondaryLocalPlanningAuthorityRadioGroup: RadioGroupComponent;

	constructor(page: Page) {
		this.commonComponent = new CommonComponent(page);
		this.secondaryLocalPlanningAuthorityRadioGroup = new RadioGroupComponent(page, 'hasSecondaryLpa');
	}

	private readonly optionTextMap: Record<SecondaryLocalPlanningAuthorityOption, string> =
		SECONDARY_LOCAL_PLANNING_AUTHORITY.options;

	public readonly actions = {
		/**
		 * Selects whether the application has a secondary local planning authority.
		 */
		selectSecondaryLPAOption: async (option: SecondaryLocalPlanningAuthorityOption) => {
			await this.secondaryLocalPlanningAuthorityRadioGroup.actions.selectOption(this.optionTextMap[option]);

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the secondary local planning authority page is displayed.
		 * Full validation also checks URL, radio options, back link, and continue button.
		 */
		isPageDisplayed: async (options: SecondaryLocalPlanningAuthorityPageOptions = {}) => {
			const { variant = 'application', pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			const pageStrings = SECONDARY_LOCAL_PLANNING_AUTHORITY.pages[variant];

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
					await this.secondaryLocalPlanningAuthorityRadioGroup.assertions.hasOptions(Object.values(this.optionTextMap));
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
		 * Verifies the secondary local planning authority required error.
		 */
		isErrorDisplayed: async (options: Pick<PageDisplayOptions, 'timeout'> = {}) => {
			const timeout = options.timeout ?? DEFAULT_TIMEOUT;

			await this.commonComponent.assertions.verifyErrorSummary(SECONDARY_LOCAL_PLANNING_AUTHORITY.error, {
				href: SECONDARY_LOCAL_PLANNING_AUTHORITY.errorHref,
				inlineId: SECONDARY_LOCAL_PLANNING_AUTHORITY.inlineErrorId,
				timeout
			});

			return this.assertions;
		},

		/**
		 * Verifies the expected secondary local planning authority option is selected.
		 */
		hasSelectedRadioButton: async (option: SecondaryLocalPlanningAuthorityOption) => {
			await this.secondaryLocalPlanningAuthorityRadioGroup.assertions.isOptionSelected(this.optionTextMap[option]);

			return this.assertions;
		}
	};
}

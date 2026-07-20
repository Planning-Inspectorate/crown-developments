import { expect, type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { ListboxComponent } from '../page-components/listbox.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { WHICH_PLANNING_AUTHORITY } from '../page-strings/create-case.strings.ts';
import { type ApplicationVariant, type PageDisplayOptions } from '../types/page-options.type.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.whichPlanningAuthority;

export type WhichPlanningAuthorityType = 'primary' | 'secondary';

type WhichPlanningAuthorityPageOptions = PageDisplayOptions & {
	variant?: ApplicationVariant;
	WhichPlanningAuthorityType?: WhichPlanningAuthorityType;
};

type WhichPlanningAuthorityErrorOptions = {
	WhichPlanningAuthorityType?: WhichPlanningAuthorityType;
};

type WhichPlanningAuthorityValueOptions = {
	WhichPlanningAuthorityType?: WhichPlanningAuthorityType;
};

export class WhichPlanningAuthorityPage {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	public readonly WhichPlanningAuthorityListbox: ListboxComponent;
	public readonly secondaryLocalPlanningAuthorityListbox: ListboxComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
		this.WhichPlanningAuthorityListbox = new ListboxComponent(page, 'lpaId');
		this.secondaryLocalPlanningAuthorityListbox = new ListboxComponent(page, 'secondaryLpaId');
	}

	private getPageConfig(WhichPlanningAuthorityType: WhichPlanningAuthorityType, variant: ApplicationVariant) {
		if (WhichPlanningAuthorityType === 'secondary') {
			return {
				...WHICH_PLANNING_AUTHORITY.secondaryPages[variant],
				inputId: 'secondaryLpaId',
				selectId: 'secondaryLpaId-select',
				error: WHICH_PLANNING_AUTHORITY.secondaryError,
				errorHref: WHICH_PLANNING_AUTHORITY.secondaryErrorHref,
				inlineErrorId: WHICH_PLANNING_AUTHORITY.secondaryInlineErrorId,
				listbox: this.secondaryLocalPlanningAuthorityListbox
			};
		}

		return {
			...WHICH_PLANNING_AUTHORITY.pages[variant],
			inputId: 'lpaId',
			selectId: 'lpaId-select',
			error: WHICH_PLANNING_AUTHORITY.error,
			errorHref: WHICH_PLANNING_AUTHORITY.errorHref,
			inlineErrorId: WHICH_PLANNING_AUTHORITY.inlineErrorId,
			listbox: this.WhichPlanningAuthorityListbox
		};
	}

	public readonly assertions = {
		isPageDisplayed: async (options: WhichPlanningAuthorityPageOptions = {}) => {
			const {
				variant = 'preApplication',
				WhichPlanningAuthorityType = 'primary',
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			const pageConfig = this.getPageConfig(WhichPlanningAuthorityType, variant);

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(pageConfig.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(pageConfig.title, {
						timeout
					});
				},
				async () => {
					await expect(
						this.page.locator(`label[for="${pageConfig.inputId}"]`, {
							hasText: pageConfig.title
						}),
						'Local planning authority label should be visible'
					).toBeVisible({
						timeout
					});
					await expect(
						this.page.locator(`input#${pageConfig.inputId}[role="combobox"]`),
						'Local planning authority listbox should be visible'
					).toBeVisible({
						timeout
					});
					await expect(
						this.page.locator(`#${pageConfig.selectId}`),
						'Local planning authority select should be attached'
					).toBeAttached();
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

		hasPlanningAuthorityValue: async (expectedValue: string, options: WhichPlanningAuthorityValueOptions = {}) => {
			const { WhichPlanningAuthorityType = 'primary' } = options;
			const pageConfig = this.getPageConfig(WhichPlanningAuthorityType, 'preApplication');

			await pageConfig.listbox.assertions.hasValue(expectedValue);

			return this.assertions;
		},

		isErrorDisplayed: async (options: WhichPlanningAuthorityErrorOptions = {}) => {
			const { WhichPlanningAuthorityType = 'primary' } = options;
			const pageConfig = this.getPageConfig(WhichPlanningAuthorityType, 'preApplication');

			await this.commonComponent.assertions.verifyErrorSummary(pageConfig.error, {
				href: pageConfig.errorHref,
				inlineId: pageConfig.inlineErrorId
			});

			await expect(
				this.page.locator('.govuk-form-group--error', {
					hasText: pageConfig.error
				}),
				'Which planning authority form group should show an error'
			).toBeVisible();

			return this.assertions;
		}
	};
}

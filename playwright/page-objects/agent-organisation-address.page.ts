import { expect, type Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { AddressUtility, type AddressErrorHrefIds } from '../page-components/address.component.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { AGENT_ORGANISATION_ADDRESS } from '../page-strings/create-case.strings.ts';
import { type PageDisplayOptions } from '../types/page-options.type.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.agentOrganisationAddress;

const AGENT_ORGANISATION_ADDRESS_ERROR_HREF_IDS = {
	line1: 'agentAddress_addressLine1',
	line2: 'agentAddress_addressLine2',
	town: 'agentAddress_townCity',
	county: 'agentAddress_county',
	postcode: 'agentAddress_postcode'
} satisfies AddressErrorHrefIds;

const AGENT_ORGANISATION_ADDRESS_FIELDS = [
	{
		fieldId: 'address-line-1',
		name: 'agentAddress_addressLine1',
		label: 'Address line 1 (optional)',
		autocomplete: 'address-line1'
	},
	{
		fieldId: 'address-line-2',
		name: 'agentAddress_addressLine2',
		label: 'Address line 2 (optional)',
		autocomplete: 'address-line2'
	},
	{
		fieldId: 'address-town',
		name: 'agentAddress_townCity',
		label: 'Town or city (optional)',
		autocomplete: 'address-level2'
	},
	{
		fieldId: 'address-county',
		name: 'agentAddress_county',
		label: 'County (optional)',
		autocomplete: 'address-level1'
	},
	{
		fieldId: 'address-postcode',
		name: 'agentAddress_postcode',
		label: 'Postcode (optional)',
		autocomplete: 'postal-code'
	}
] as const;

export class AgentOrganisationAddressPage {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	public readonly address: AddressUtility;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
		this.address = new AddressUtility(page, {
			errorHrefIds: AGENT_ORGANISATION_ADDRESS_ERROR_HREF_IDS
		});
	}

	public readonly assertions = {
		/**
		 * Verifies the agent organisation address page is displayed.
		 * Full validation also checks the hint, fields, labels,
		 * back link, and continue button.
		 */
		isPageDisplayed: async (options: PageDisplayOptions = {}) => {
			const { pageValidation = 'fullValidation', timeout = DEFAULT_TIMEOUT } = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageURL(AGENT_ORGANISATION_ADDRESS.url, {
						timeout
					});
					await this.commonComponent.assertions.verifyPageTitle(AGENT_ORGANISATION_ADDRESS.title, {
						timeout
					});
				},
				async () => {
					await expect(
						this.page.locator('.govuk-hint', {
							hasText: AGENT_ORGANISATION_ADDRESS.hint
						}),
						'Agent organisation address optional hint should be visible'
					).toBeVisible({
						timeout
					});

					for (const field of AGENT_ORGANISATION_ADDRESS_FIELDS) {
						await expect(
							this.page.locator(`label[for="${field.fieldId}"]`, {
								hasText: field.label
							}),
							`Label '${field.label}' should be visible`
						).toBeVisible({
							timeout
						});

						const input = this.page.locator(`#${field.fieldId}`);

						await expect(input, `Input '${field.fieldId}' should be visible`).toBeVisible({
							timeout
						});
						await expect(input).toHaveAttribute('name', field.name);
						await expect(input).toHaveAttribute('type', 'text');
						await expect(input).toHaveAttribute('autocomplete', field.autocomplete);
					}

					await this.commonComponent.assertions.checkActionExists('back', {
						timeout
					});
					await this.commonComponent.assertions.checkActionExists('continue', {
						timeout
					});
				}
			);

			return this.assertions;
		}
	};
}

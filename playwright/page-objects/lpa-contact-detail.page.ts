import { expect, type Page } from '@playwright/test';

import {
	ContactDetailsComponent,
	type ContactDetailsError,
	type ContactDetailsErrorMessages,
	type ContactDetailsFieldIds
} from '../page-components/contact-details.component.ts';
import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { runPageValidation } from '../page-utilities/page-validation.utility.ts';
import { LPA_CONTACT_DETAILS } from '../page-strings/create-case.strings.ts';
import { type PageDisplayOptions } from '../types/page-options.type.ts';

const DEFAULT_TIMEOUT = PAGE_TIMEOUTS.pages.lpaContactDetail;

const REQUIRED_CONTACT_DETAILS_ERRORS = [
	'firstNameRequired',
	'lastNameRequired',
	'emailRequired'
] as const satisfies readonly ContactDetailsError[];

export type LPAContactDetailsType = 'primary' | 'secondary';

type LPAContactDetailsPageOptions = PageDisplayOptions & {
	localPlanningAuthorityContactDetailsType?: LPAContactDetailsType;
};

type LPAContactDetailsErrorOptions = {
	localPlanningAuthorityContactDetailsType?: LPAContactDetailsType;
	errors?: ContactDetailsError | readonly ContactDetailsError[];
	timeout?: number;
};

const LPA_CONTACT_DETAILS_FIELD_IDS: ContactDetailsFieldIds = {
	firstName: 'lpaFirstName',
	lastName: 'lpaLastName',
	email: 'lpaEmailAddress',
	telephoneNumber: 'lpaPhoneNumber'
};

const SECONDARY_LPA_CONTACT_DETAILS_FIELD_IDS: ContactDetailsFieldIds = {
	firstName: 'secondaryLpaFirstName',
	lastName: 'secondaryLpaLastName',
	email: 'secondaryLpaEmailAddress',
	telephoneNumber: 'secondaryLpaPhoneNumber'
};

/**
 * Page-specific error wording for the primary LPA page.
 *
 * Errors not defined here use the generic wording from
 * ContactDetailsComponent.
 */
const LPA_CONTACT_DETAILS_ERROR_MESSAGES: ContactDetailsErrorMessages = {
	firstNameRequired: "Enter LPA contact's first name",
	lastNameRequired: "Enter LPA contact's last name",
	emailRequired: "Enter LPA contact's email address"
};

/**
 * Page-specific error wording for the secondary LPA page.
 *
 * Update these three messages if the secondary page HTML uses
 * different wording.
 */
const SECONDARY_LPA_CONTACT_DETAILS_ERROR_MESSAGES: ContactDetailsErrorMessages = {
	firstNameRequired: "Enter secondary LPA contact's first name",
	lastNameRequired: "Enter secondary LPA contact's last name",
	emailRequired: "Enter secondary LPA contact's email address"
};

const LPA_CONTACT_DETAILS_FIELDS = [
	{
		fieldId: LPA_CONTACT_DETAILS_FIELD_IDS.firstName,
		label: 'First name'
	},
	{
		fieldId: LPA_CONTACT_DETAILS_FIELD_IDS.lastName,
		label: 'Last name'
	},
	{
		fieldId: LPA_CONTACT_DETAILS_FIELD_IDS.email,
		label: 'Email address'
	},
	{
		fieldId: LPA_CONTACT_DETAILS_FIELD_IDS.telephoneNumber,
		label: 'Phone number'
	}
] as const;

const SECONDARY_LPA_CONTACT_DETAILS_FIELDS = [
	{
		fieldId: SECONDARY_LPA_CONTACT_DETAILS_FIELD_IDS.firstName,
		label: 'First name'
	},
	{
		fieldId: SECONDARY_LPA_CONTACT_DETAILS_FIELD_IDS.lastName,
		label: 'Last name'
	},
	{
		fieldId: SECONDARY_LPA_CONTACT_DETAILS_FIELD_IDS.email,
		label: 'Email address'
	},
	{
		fieldId: SECONDARY_LPA_CONTACT_DETAILS_FIELD_IDS.telephoneNumber,
		label: 'Phone number'
	}
] as const;

export class LPAContactDetailsPage {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	public readonly contactDetails: ContactDetailsComponent;
	public readonly secondaryContactDetails: ContactDetailsComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);

		this.contactDetails = new ContactDetailsComponent(
			page,
			LPA_CONTACT_DETAILS_FIELD_IDS,
			LPA_CONTACT_DETAILS_ERROR_MESSAGES
		);

		this.secondaryContactDetails = new ContactDetailsComponent(
			page,
			SECONDARY_LPA_CONTACT_DETAILS_FIELD_IDS,
			SECONDARY_LPA_CONTACT_DETAILS_ERROR_MESSAGES
		);
	}

	private getPageConfig(localPlanningAuthorityContactDetailsType: LPAContactDetailsType) {
		if (localPlanningAuthorityContactDetailsType === 'secondary') {
			return {
				...LPA_CONTACT_DETAILS.pages.secondary,
				fields: SECONDARY_LPA_CONTACT_DETAILS_FIELDS,
				contactDetailsComponent: this.secondaryContactDetails
			};
		}

		return {
			...LPA_CONTACT_DETAILS.pages.primary,
			fields: LPA_CONTACT_DETAILS_FIELDS,
			contactDetailsComponent: this.contactDetails
		};
	}

	public readonly assertions = {
		/**
		 * Verifies the LPA contact details page is displayed.
		 * Full validation also checks URL, fields, labels, back link, and continue button.
		 */
		isPageDisplayed: async (options: LPAContactDetailsPageOptions = {}) => {
			const {
				localPlanningAuthorityContactDetailsType = 'primary',
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			const pageConfig = this.getPageConfig(localPlanningAuthorityContactDetailsType);

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
					await this.commonComponent.assertions.checkActionExists('back', {
						timeout
					});

					for (const field of pageConfig.fields) {
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
						await expect(input).toHaveAttribute('name', field.fieldId);
						await expect(input).toHaveAttribute('type', 'text');
					}

					await this.commonComponent.assertions.checkActionExists('continue', {
						timeout
					});
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies LPA contact detail errors using the shared component.
		 *
		 * When no errors are supplied, the required first name,
		 * last name and email errors are checked.
		 */
		isErrorDisplayed: async (options: LPAContactDetailsErrorOptions = {}) => {
			const {
				localPlanningAuthorityContactDetailsType = 'primary',
				errors = REQUIRED_CONTACT_DETAILS_ERRORS,
				timeout = DEFAULT_TIMEOUT
			} = options;

			const pageConfig = this.getPageConfig(localPlanningAuthorityContactDetailsType);

			await pageConfig.contactDetailsComponent.assertions.isErrorDisplayed(errors, {
				timeout
			});

			return this.assertions;
		}
	};
}

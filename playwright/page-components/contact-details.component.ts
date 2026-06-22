import { expect, type Locator, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import { runPageValidation, type PageValidation } from '../page-utilities/page-validation.utility.ts';

const DEFAULT_TIMEOUT = 12_000;

export type ContactDetails = {
	firstName: string;
	lastName: string;
	email: string;
	telephoneNumber: string;
};

export type ContactDetailsError =
	| 'firstNameRequired'
	| 'firstNameInvalidCharacters'
	| 'firstNameTooLong'
	| 'lastNameRequired'
	| 'lastNameInvalidCharacters'
	| 'lastNameTooLong'
	| 'emailInvalid'
	| 'emailTooLong'
	| 'telephoneNumberInvalid'
	| 'telephoneNumberTooLong';

export type ContactDetailsFieldIds = {
	firstName: string;
	lastName: string;
	email: string;
	telephoneNumber: string;
};

type ContactDetailsFieldKey = keyof ContactDetailsFieldIds;

type ContactDetailsErrorExpectation = {
	message: string;
	fieldKey: ContactDetailsFieldKey;
};

type ContactDetailsPageField = {
	fieldId: string;
	label: string;
};

type ContactDetailsPageOptions = {
	expectedTitle?: string;
	expectedUrlContains?: string | string[];
	expectedFields?: readonly ContactDetailsPageField[];
	pageValidation?: PageValidation;
	timeout?: number;
};

const defaultContactDetailsFieldIds: ContactDetailsFieldIds = {
	firstName: 'applicantFirstName',
	lastName: 'applicantLastName',
	email: 'applicantContactEmail',
	telephoneNumber: 'applicantContactTelephoneNumber'
};

const contactDetailsErrorMap: Record<ContactDetailsError, ContactDetailsErrorExpectation> = {
	firstNameRequired: {
		message: 'Enter a first name',
		fieldKey: 'firstName'
	},

	firstNameInvalidCharacters: {
		message: 'First name must only include letters, spaces, hyphens and apostrophes',
		fieldKey: 'firstName'
	},

	firstNameTooLong: {
		message: 'Input too long - Please enter no more than 250 characters',
		fieldKey: 'firstName'
	},

	lastNameRequired: {
		message: 'Enter a last name',
		fieldKey: 'lastName'
	},

	lastNameInvalidCharacters: {
		message: 'Last name must only include letters, spaces, hyphens and apostrophes',
		fieldKey: 'lastName'
	},

	lastNameTooLong: {
		message: 'Input too long - Please enter no more than 250 characters',
		fieldKey: 'lastName'
	},

	emailInvalid: {
		message: 'Enter an email address in the correct format, like name@example.com',
		fieldKey: 'email'
	},

	emailTooLong: {
		message: 'Input too long - Please enter no more than 50 characters',
		fieldKey: 'email'
	},

	telephoneNumberInvalid: {
		message: 'Enter a valid phone number',
		fieldKey: 'telephoneNumber'
	},

	telephoneNumberTooLong: {
		message: 'Phone number must be 15 characters or less',
		fieldKey: 'telephoneNumber'
	}
};

export class ContactDetailsComponent {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;
	private readonly fieldIds: ContactDetailsFieldIds;

	constructor(page: Page, fieldIds: ContactDetailsFieldIds = defaultContactDetailsFieldIds) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
		this.fieldIds = fieldIds;
	}

	/**
	 * Fills a contact details field and verifies the value.
	 */
	private async fillField(field: Locator, value: string, fieldName: string): Promise<void> {
		await expect(field, `${fieldName} field should be visible`).toBeVisible();
		await field.fill(value);
		await expect(field, `${fieldName} field should contain '${value}'`).toHaveValue(value);
	}

	public readonly actions = {
		/**
		 * Enters all contact details.
		 * Missing values are entered as empty strings.
		 */
		enterContactDetails: async (contactDetails: Partial<ContactDetails>): Promise<ContactDetails> => {
			const values: ContactDetails = {
				firstName: contactDetails.firstName ?? '',
				lastName: contactDetails.lastName ?? '',
				email: contactDetails.email ?? '',
				telephoneNumber: contactDetails.telephoneNumber ?? ''
			};

			await this.fillField(this.page.locator(`#${this.fieldIds.firstName}`), values.firstName, 'First name');
			await this.fillField(this.page.locator(`#${this.fieldIds.lastName}`), values.lastName, 'Last name');
			await this.fillField(this.page.locator(`#${this.fieldIds.email}`), values.email, 'Email');
			await this.fillField(
				this.page.locator(`#${this.fieldIds.telephoneNumber}`),
				values.telephoneNumber,
				'Telephone number'
			);

			return values;
		},

		/**
		 * Enters the first name only.
		 */
		enterFirstName: async (firstName: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.firstName}`), firstName, 'First name');

			return this.actions;
		},

		/**
		 * Enters the last name only.
		 */
		enterLastName: async (lastName: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.lastName}`), lastName, 'Last name');

			return this.actions;
		},

		/**
		 * Enters the email address only.
		 */
		enterEmail: async (email: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.email}`), email, 'Email');

			return this.actions;
		},

		/**
		 * Enters the telephone number only.
		 */
		enterTelephoneNumber: async (telephoneNumber: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.telephoneNumber}`), telephoneNumber, 'Telephone number');

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the contact details page is displayed.
		 * Full validation also checks URL, fields, labels, and continue button.
		 */
		isPageDisplayed: async (options: ContactDetailsPageOptions = {}) => {
			const {
				expectedTitle = 'Add agent contact details',
				expectedUrlContains,
				expectedFields = [
					{
						fieldId: this.fieldIds.firstName,
						label: 'First name'
					},
					{
						fieldId: this.fieldIds.lastName,
						label: 'Last name'
					},
					{
						fieldId: this.fieldIds.email,
						label: 'Email'
					},
					{
						fieldId: this.fieldIds.telephoneNumber,
						label: 'Phone number (optional)'
					}
				],
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageLoaded(expectedTitle, {
						timeout
					});

					await this.commonComponent.assertions.verifyPageTitle(expectedTitle, {
						timeout
					});
				},
				async () => {
					if (expectedUrlContains) {
						await this.commonComponent.assertions.verifyPageURL(expectedUrlContains, {
							timeout
						});
					}

					for (const field of expectedFields) {
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

					const continueButton = this.page.locator('[data-cy="button-save-and-continue"]');

					await expect(continueButton, 'Continue button should be visible').toBeVisible({
						timeout
					});

					await expect(continueButton).toHaveAttribute('type', 'submit');
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies contact details validation errors.
		 */
		hasContactDetailsErrors: async (errors: ContactDetailsError | ContactDetailsError[]) => {
			const errorsToCheck = Array.isArray(errors) ? errors : [errors];
			const uniqueErrors = [...new Set(errorsToCheck)];

			await expect(
				this.page.locator('.govuk-error-summary__list li'),
				`Error summary should contain exactly ${uniqueErrors.length} error(s)`
			).toHaveCount(uniqueErrors.length);

			for (const error of uniqueErrors) {
				const expected = contactDetailsErrorMap[error];
				const fieldId = this.fieldIds[expected.fieldKey];
				const inlineErrorId = `${fieldId}-error`;

				await this.commonComponent.assertions.verifyErrorSummary(expected.message, {
					href: `#${fieldId}`,
					inlineId: inlineErrorId
				});

				const field = this.page.locator(`#${fieldId}`);

				await expect(field, `Field '${fieldId}' should have an error class`).toHaveClass(/govuk-input--error/);
				await expect(field).toHaveAttribute('aria-describedby', inlineErrorId);
			}

			return this.assertions;
		},

		/**
		 * Verifies the contact detail field values.
		 */
		hasContactDetailsValues: async (expected: ContactDetails) => {
			await expect(this.page.locator(`#${this.fieldIds.firstName}`)).toHaveValue(expected.firstName);
			await expect(this.page.locator(`#${this.fieldIds.lastName}`)).toHaveValue(expected.lastName);
			await expect(this.page.locator(`#${this.fieldIds.email}`)).toHaveValue(expected.email);
			await expect(this.page.locator(`#${this.fieldIds.telephoneNumber}`)).toHaveValue(expected.telephoneNumber);

			return this.assertions;
		}
	};
}

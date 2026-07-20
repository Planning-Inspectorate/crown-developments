import { expect, type Locator, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import {
	generateRandomEmailAddress,
	generateRandomFirstName,
	generateRandomLastName,
	generateRandomTelephoneNumber
} from '../page-utilities/generate.utility.ts';
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
	| 'emailRequired'
	| 'emailInvalid'
	| 'emailTooLong'
	| 'telephoneNumberInvalid'
	| 'telephoneNumberTooLong';

export type ContactDetailsErrorMessages = Partial<Record<ContactDetailsError, string>>;

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

type ContactDetailsErrorOptions = {
	timeout?: number;
};

const DEFAULT_REQUIRED_ERRORS = [
	'firstNameRequired',
	'lastNameRequired',
	'emailRequired'
] as const satisfies readonly ContactDetailsError[];

const DEFAULT_CONTACT_DETAILS_FIELD_IDS: ContactDetailsFieldIds = {
	firstName: 'applicantFirstName',
	lastName: 'applicantLastName',
	email: 'applicantContactEmail',
	telephoneNumber: 'applicantContactTelephoneNumber'
};

const CONTACT_DETAILS_ERROR_MAP: Record<ContactDetailsError, ContactDetailsErrorExpectation> = {
	firstNameRequired: {
		message: 'Enter a first name',
		fieldKey: 'firstName'
	},
	firstNameInvalidCharacters: {
		message: 'First name must only include letters, spaces, hyphens and apostrophes',
		fieldKey: 'firstName'
	},
	firstNameTooLong: {
		message: 'First name must be between 1 and 250 characters',
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
		message: 'Last name must be between 1 and 250 characters',
		fieldKey: 'lastName'
	},
	emailRequired: {
		message: 'Enter an email address',
		fieldKey: 'email'
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
	private readonly errorMessages: ContactDetailsErrorMessages;

	constructor(
		page: Page,
		fieldIds: ContactDetailsFieldIds = DEFAULT_CONTACT_DETAILS_FIELD_IDS,
		errorMessages: ContactDetailsErrorMessages = {}
	) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
		this.fieldIds = fieldIds;
		this.errorMessages = errorMessages;
	}

	/**
	 * Fills a contact details field and verifies its value.
	 */
	private async fillField(field: Locator, value: string, fieldName: string): Promise<void> {
		await expect(field, `${fieldName} field should be visible`).toBeVisible();
		await field.fill(value);
		await expect(field, `${fieldName} field should contain '${value}'`).toHaveValue(value);
	}

	/**
	 * Generates valid contact details.
	 * Supplied values override the generated defaults.
	 */
	private generateContactDetails(overrides: Partial<ContactDetails> = {}): ContactDetails {
		const firstName = overrides.firstName ?? generateRandomFirstName();
		const lastName = overrides.lastName ?? generateRandomLastName();

		return {
			firstName,
			lastName,
			email: overrides.email ?? generateRandomEmailAddress(firstName, lastName),
			telephoneNumber: overrides.telephoneNumber ?? generateRandomTelephoneNumber()
		};
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
		 * Enters generated contact details.
		 * Supplied values override the generated defaults.
		 */
		enterGeneratedContactDetails: async (contactDetails: Partial<ContactDetails> = {}): Promise<ContactDetails> => {
			const generatedContactDetails = this.generateContactDetails(contactDetails);

			await this.actions.enterContactDetails(generatedContactDetails);

			return generatedContactDetails;
		},

		/**
		 * Enters the first name.
		 */
		enterFirstName: async (firstName: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.firstName}`), firstName, 'First name');

			return this.actions;
		},

		/**
		 * Enters the last name.
		 */
		enterLastName: async (lastName: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.lastName}`), lastName, 'Last name');

			return this.actions;
		},

		/**
		 * Enters the email address.
		 */
		enterEmail: async (email: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.email}`), email, 'Email');

			return this.actions;
		},

		/**
		 * Enters the telephone number.
		 */
		enterTelephoneNumber: async (telephoneNumber: string) => {
			await this.fillField(this.page.locator(`#${this.fieldIds.telephoneNumber}`), telephoneNumber, 'Telephone number');

			return this.actions;
		},

		/**
		 * Clears all contact detail fields.
		 */
		clearContactDetails: async () => {
			await this.page.locator(`#${this.fieldIds.firstName}`).clear();
			await this.page.locator(`#${this.fieldIds.lastName}`).clear();
			await this.page.locator(`#${this.fieldIds.email}`).clear();
			await this.page.locator(`#${this.fieldIds.telephoneNumber}`).clear();

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies a contact details page is displayed.
		 * Full validation also checks the configured fields and continue button.
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
						label: 'Phone number'
					}
				],
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			await runPageValidation(
				pageValidation,
				async () => {
					if (expectedUrlContains) {
						await this.commonComponent.assertions.verifyPageURL(expectedUrlContains, {
							timeout
						});
					}

					await this.commonComponent.assertions.verifyPageTitle(expectedTitle, {
						timeout
					});
				},
				async () => {
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

					await this.commonComponent.assertions.checkActionExists('continue', {
						timeout
					});
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies one or more contact detail validation errors.
		 *
		 * When no errors are supplied, the required first name,
		 * last name and email errors are checked.
		 */
		isErrorDisplayed: async (
			errors: ContactDetailsError | readonly ContactDetailsError[] = DEFAULT_REQUIRED_ERRORS,
			options: ContactDetailsErrorOptions = {}
		) => {
			const timeout = options.timeout ?? DEFAULT_TIMEOUT;
			const errorsToCheck: ContactDetailsError[] = typeof errors === 'string' ? [errors] : [...errors];
			const uniqueErrors = [...new Set(errorsToCheck)];

			await expect(
				this.page.locator('.govuk-error-summary__list li'),
				`Error summary should contain exactly ${uniqueErrors.length} error(s)`
			).toHaveCount(uniqueErrors.length, {
				timeout
			});

			for (const errorType of uniqueErrors) {
				const errorConfig = CONTACT_DETAILS_ERROR_MAP[errorType];
				const message = this.errorMessages[errorType] ?? errorConfig.message;
				const fieldId = this.fieldIds[errorConfig.fieldKey];
				const inlineErrorId = `${fieldId}-error`;

				await this.commonComponent.assertions.verifyErrorSummary(message, {
					href: `#${fieldId}`,
					inlineId: inlineErrorId,
					timeout
				});

				const field = this.page.locator(`#${fieldId}`);
				const inlineError = this.page.locator(`#${inlineErrorId}`);
				const formGroup = this.page.locator('.govuk-form-group', {
					has: field
				});

				await expect(formGroup, `Form group for '${fieldId}' should have the error class`).toHaveClass(
					/govuk-form-group--error/,
					{
						timeout
					}
				);
				await expect(inlineError, `Inline error for '${fieldId}' should contain '${message}'`).toContainText(message, {
					timeout
				});
				await expect(field, `Field '${fieldId}' should have the error class`).toHaveClass(/govuk-input--error/, {
					timeout
				});
				await expect(field).toHaveAttribute('aria-describedby', new RegExp(`(^|\\s)${inlineErrorId}(\\s|$)`), {
					timeout
				});
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

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import { generateUkAddress } from '../page-utilities/generate.utility.ts';

export type UkAddress = {
	line1: string;
	line2: string;
	town: string;
	county: string;
	postcode: string;
};

type AddressFieldKey = 'address-line-1' | 'address-line-2' | 'address-town' | 'address-county' | 'address-postcode';

type AddressErrorType =
	| 'line1TooLong'
	| 'line2TooLong'
	| 'townTooLong'
	| 'countyTooLong'
	| 'postcodeLength'
	| 'invalidPostcodeFormat';

type AddressErrorConfig = {
	message: string;
	inlineId: string;
	inputId: AddressFieldKey;
};

const ADDRESS_FIELD_MAX_CHARACTERS = 250;
const POSTCODE_MIN_CHARACTERS = 5;
const POSTCODE_MAX_CHARACTERS = 8;

const addressErrorMap: Record<AddressErrorType, AddressErrorConfig> = {
	line1TooLong: {
		message: `Address line 1 must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		inlineId: 'address-line-1-error',
		inputId: 'address-line-1'
	},

	line2TooLong: {
		message: `Address line 2 must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		inlineId: 'address-line-2-error',
		inputId: 'address-line-2'
	},

	townTooLong: {
		message: `Town or city must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		inlineId: 'address-town-error',
		inputId: 'address-town'
	},

	countyTooLong: {
		message: `County must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		inlineId: 'address-county-error',
		inputId: 'address-county'
	},

	postcodeLength: {
		message: `Postcode must be between ${POSTCODE_MIN_CHARACTERS} and ${POSTCODE_MAX_CHARACTERS} characters`,
		inlineId: 'address-postcode-error',
		inputId: 'address-postcode'
	},

	invalidPostcodeFormat: {
		message: 'Enter a valid postcode',
		inlineId: 'address-postcode-error',
		inputId: 'address-postcode'
	}
};

export class AddressUtility {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
	}

	private readonly locators = {
		addressLine1: (): Locator => this.page.locator('#address-line-1'),
		addressLine2: (): Locator => this.page.locator('#address-line-2'),
		town: (): Locator => this.page.locator('#address-town'),
		county: (): Locator => this.page.locator('#address-county'),
		postcode: (): Locator => this.page.locator('#address-postcode')
	};

	/**
	 * Fills an address field and verifies the entered value.
	 */
	private async fillField(field: Locator, value: string): Promise<void> {
		await expect(field, 'Address field should be visible before entering a value').toBeVisible();
		await field.fill(value);
		await expect(field).toHaveValue(value);
	}

	public readonly actions = {
		/**
		 * Enters address details into all address fields.
		 *
		 * Uses generated UK address values by default, unless
		 * `useGeneratedDefaults` is set to false.
		 *
		 * Any supplied override values replace the generated defaults.
		 */
		enterAddress: async (overrides?: Partial<UkAddress>, useGeneratedDefaults = true): Promise<UkAddress> => {
			const address: UkAddress = {
				...(useGeneratedDefaults
					? generateUkAddress()
					: {
							line1: '',
							line2: '',
							town: '',
							county: '',
							postcode: ''
						}),
				...overrides
			};

			await this.fillField(this.locators.addressLine1(), address.line1);
			await this.fillField(this.locators.addressLine2(), address.line2);
			await this.fillField(this.locators.town(), address.town);
			await this.fillField(this.locators.county(), address.county);
			await this.fillField(this.locators.postcode(), address.postcode);

			return address;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies GOV.UK address validation errors.
		 *
		 * When an error type is supplied, this checks the error summary,
		 * inline error, invalid input styling, and aria-describedby.
		 *
		 * When no error type is supplied, this verifies that no error
		 * summary is present.
		 */
		hasAddressErrors: async (errorType?: AddressErrorType | AddressErrorType[]) => {
			if (!errorType) {
				await expect(this.page.locator('.govuk-error-summary')).not.toBeAttached();

				return this.assertions;
			}

			const errorsToCheck = Array.isArray(errorType) ? errorType : [errorType];

			await expect(this.page.locator('.govuk-error-summary__list li')).toHaveCount(errorsToCheck.length);

			for (const error of errorsToCheck) {
				const { message, inlineId, inputId } = addressErrorMap[error];

				await this.commonComponent.assertions.verifyErrorSummary(message, {
					href: `#${inputId}`,
					inlineId
				});

				const addressField = this.page.locator(`#${inputId}`);

				await expect(addressField, `Address input '${inputId}' should be marked as invalid`).toHaveClass(
					/govuk-input--error/
				);

				await expect(addressField).toHaveAttribute('aria-describedby', inlineId);
			}

			return this.assertions;
		},

		hasAddressValues: async (address: UkAddress) => {
			await expect(this.locators.addressLine1()).toHaveValue(address.line1);
			await expect(this.locators.addressLine2()).toHaveValue(address.line2);
			await expect(this.locators.town()).toHaveValue(address.town);
			await expect(this.locators.county()).toHaveValue(address.county);
			await expect(this.locators.postcode()).toHaveValue(address.postcode);

			return this.assertions;
		}
	};
}

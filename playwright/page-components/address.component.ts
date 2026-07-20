import { expect, type Locator, type Page } from '@playwright/test';

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
export type AddressFieldIds = {
	line1: string;
	line2: string;
	town: string;
	county: string;
	postcode: string;
};

export type AddressErrorHrefIds = {
	line1: string;
	line2: string;
	town: string;
	county: string;
	postcode: string;
};

export type AddressInlineErrorIds = {
	line1: string;
	line2: string;
	town: string;
	county: string;
	postcode: string;
};

export type AddressErrorType =
	| 'line1TooLong'
	| 'line2TooLong'
	| 'townTooLong'
	| 'countyTooLong'
	| 'postcodeLength'
	| 'invalidPostcodeFormat';

type AddressFieldKey = keyof AddressFieldIds;

type AddressErrorConfig = {
	message: string;
	fieldKey: AddressFieldKey;
};

export type AddressUtilityOptions = {
	fieldIds?: Partial<AddressFieldIds>;
	errorHrefIds?: Partial<AddressErrorHrefIds>;
	inlineErrorIds?: Partial<AddressInlineErrorIds>;
};

const ADDRESS_FIELD_MAX_CHARACTERS = 250;
const POSTCODE_MIN_CHARACTERS = 5;
const POSTCODE_MAX_CHARACTERS = 8;

const DEFAULT_ADDRESS_FIELD_IDS: AddressFieldIds = {
	line1: 'address-line-1',
	line2: 'address-line-2',
	town: 'address-town',
	county: 'address-county',
	postcode: 'address-postcode'
};

const ADDRESS_ERROR_MAP: Record<AddressErrorType, AddressErrorConfig> = {
	line1TooLong: {
		message: `Address line 1 must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		fieldKey: 'line1'
	},
	line2TooLong: {
		message: `Address line 2 must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		fieldKey: 'line2'
	},
	townTooLong: {
		message: `Town or city must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		fieldKey: 'town'
	},
	countyTooLong: {
		message: `County must be ${ADDRESS_FIELD_MAX_CHARACTERS} characters or less`,
		fieldKey: 'county'
	},
	postcodeLength: {
		message: `Postcode must be between ${POSTCODE_MIN_CHARACTERS} and ${POSTCODE_MAX_CHARACTERS} characters`,
		fieldKey: 'postcode'
	},
	invalidPostcodeFormat: {
		message: 'Enter a valid postcode',
		fieldKey: 'postcode'
	}
};

export class AddressUtility {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;
	private readonly fieldIds: AddressFieldIds;
	private readonly errorHrefIds: Partial<AddressErrorHrefIds>;
	private readonly inlineErrorIds: Partial<AddressInlineErrorIds>;

	constructor(page: Page, options: AddressUtilityOptions = {}) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
		this.fieldIds = {
			...DEFAULT_ADDRESS_FIELD_IDS,
			...options.fieldIds
		};
		this.errorHrefIds = options.errorHrefIds ?? {};
		this.inlineErrorIds = options.inlineErrorIds ?? {};
	}

	/**
	 * Gets the configured locator for an address input.
	 */
	private getFieldLocator(fieldKey: AddressFieldKey): Locator {
		return this.page.locator(`#${this.fieldIds[fieldKey]}`);
	}

	/**
	 * Gets the error-summary target ID.
	 *
	 * By default this uses the input ID. Individual pages can provide
	 * a different error href ID, such as `agentAddress_postcode`.
	 */
	private getErrorHrefId(fieldKey: AddressFieldKey): string {
		return this.errorHrefIds[fieldKey] ?? this.fieldIds[fieldKey];
	}

	/**
	 * Gets the inline error ID.
	 *
	 * By default this is derived from the input ID, such as
	 * `address-postcode-error`.
	 */
	private getInlineErrorId(fieldKey: AddressFieldKey): string {
		return this.inlineErrorIds[fieldKey] ?? `${this.fieldIds[fieldKey]}-error`;
	}

	/**
	 * Fills an address input and verifies the entered value.
	 */
	private async fillField(fieldKey: AddressFieldKey, value: string): Promise<void> {
		const field = this.getFieldLocator(fieldKey);
		const fieldId = this.fieldIds[fieldKey];

		await expect(field, `Address field '${fieldId}' should be visible before entering a value`).toBeVisible();
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

			await this.fillField('line1', address.line1);
			await this.fillField('line2', address.line2);
			await this.fillField('town', address.town);
			await this.fillField('county', address.county);
			await this.fillField('postcode', address.postcode);

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
		isErrorDisplayed: async (errorType?: AddressErrorType | readonly AddressErrorType[]) => {
			if (!errorType) {
				await expect(this.page.locator('.govuk-error-summary')).not.toBeAttached();

				return this.assertions;
			}

			const errors = typeof errorType === 'string' ? [errorType] : [...errorType];
			const errorsToCheck = [...new Set(errors)];

			await expect(
				this.page.locator('.govuk-error-summary__list li'),
				`Error summary should contain exactly ${errorsToCheck.length} error(s)`
			).toHaveCount(errorsToCheck.length);

			for (const errorTypeToCheck of errorsToCheck) {
				const errorConfig = ADDRESS_ERROR_MAP[errorTypeToCheck];
				const fieldKey = errorConfig.fieldKey;
				const inputId = this.fieldIds[fieldKey];
				const errorHrefId = this.getErrorHrefId(fieldKey);
				const inlineErrorId = this.getInlineErrorId(fieldKey);

				await this.commonComponent.assertions.verifyErrorSummary(errorConfig.message, {
					href: `#${errorHrefId}`,
					inlineId: inlineErrorId
				});

				const addressField = this.getFieldLocator(fieldKey);

				await expect(addressField, `Address input '${inputId}' should be marked as invalid`).toHaveClass(
					/govuk-input--error/
				);
				await expect(addressField).toHaveAttribute('aria-describedby', new RegExp(`(^|\\s)${inlineErrorId}(\\s|$)`));
			}

			return this.assertions;
		},

		/**
		 * Verifies the configured address field values.
		 */
		hasAddressValues: async (address: UkAddress) => {
			await expect(this.getFieldLocator('line1')).toHaveValue(address.line1);
			await expect(this.getFieldLocator('line2')).toHaveValue(address.line2);
			await expect(this.getFieldLocator('town')).toHaveValue(address.town);
			await expect(this.getFieldLocator('county')).toHaveValue(address.county);
			await expect(this.getFieldLocator('postcode')).toHaveValue(address.postcode);

			return this.assertions;
		}
	};
}

import { expect, type Page } from '@playwright/test';

const LISTBOX_OPTIONS_TIMEOUT = 60_000;

export class ListboxComponent {
	private readonly page: Page;
	private readonly inputId: string;

	constructor(page: Page, inputId: string) {
		this.page = page;
		this.inputId = inputId;
	}

	public readonly assertions = {
		/**
		 * Verifies the listbox input contains the expected value.
		 */
		hasValue: async (expectedValue: string) => {
			await expect(this.page.locator(`input#${this.inputId}[role="combobox"]`)).toHaveValue(expectedValue);

			return this.assertions;
		},

		/**
		 * Opens the listbox and verifies a specific option is visible.
		 */
		hasOption: async (optionText: string) => {
			await this.actions.openOptions();

			await expect(
				this.page.getByRole('option', {
					name: optionText,
					exact: true
				}),
				`Listbox option '${optionText}' should be visible`
			).toBeVisible();

			return this.assertions;
		}
	};

	public readonly actions = {
		/**
		 * Opens the listbox by clicking the input and entering search text.
		 * Defaults to a space so options load without filtering by a value.
		 */
		openOptions: async (searchText = ' ') => {
			const input = this.page.locator(`input#${this.inputId}[role="combobox"]`);

			await expect(input, `Listbox input '${this.inputId}' should be visible`).toBeVisible();
			await input.click();
			await input.fill(searchText);

			await expect(this.page.locator(`#${this.inputId}__listbox`)).toBeVisible({
				timeout: LISTBOX_OPTIONS_TIMEOUT
			});

			return this.actions;
		},

		/**
		 * Opens the listbox and selects a random available option.
		 * Returns the selected option text.
		 */
		selectRandomOption: async (searchText = ' '): Promise<string> => {
			await this.actions.openOptions(searchText);

			const options = this.page.locator(`[id^="${this.inputId}__option--"]`);
			const count = await options.count();

			if (count === 0) {
				throw new Error(`Test failed: No listbox options were found for '${this.inputId}'`);
			}

			const randomIndex = Math.floor(Math.random() * count);
			const option = options.nth(randomIndex);
			const selectedValue = (await option.innerText()).trim();

			await option.click();
			await expect(this.page.locator(`input#${this.inputId}[role="combobox"]`)).toHaveValue(selectedValue);

			return selectedValue;
		},

		/**
		 * Searches for and selects an exact listbox option.
		 * Returns the selected option text.
		 */
		selectOption: async (optionText: string): Promise<string> => {
			await this.actions.openOptions(optionText);

			const option = this.page.getByRole('option', {
				name: optionText,
				exact: true
			});

			await expect(option, `Listbox option '${optionText}' should be visible before selecting`).toBeVisible();
			await option.click();
			await expect(this.page.locator(`input#${this.inputId}[role="combobox"]`)).toHaveValue(optionText);

			return optionText;
		},

		/**
		 * Types search text into the listbox input without selecting an option.
		 */
		typeSearchText: async (searchText: string) => {
			const input = this.page.locator(`input#${this.inputId}[role="combobox"]`);

			await expect(input, `Listbox input '${this.inputId}' should be visible before typing`).toBeVisible();
			await input.fill(searchText);

			return this.actions;
		},

		/**
		 * Clears the listbox input value.
		 */
		clear: async () => {
			await this.page.locator(`input#${this.inputId}[role="combobox"]`).clear();

			return this.actions;
		}
	};
}

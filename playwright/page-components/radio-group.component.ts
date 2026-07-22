import { expect, type Locator, type Page } from '@playwright/test';

type RadioLabelMatchType = 'exact' | 'contains';

export class RadioGroupComponent {
	private readonly page: Page;
	private readonly radioName: string;

	constructor(page: Page, radioName: string) {
		this.page = page;
		this.radioName = radioName;
	}

	private readonly locators = {
		radioInputs: (): Locator => this.page.locator(`input[type="radio"][name="${this.radioName}"]`)
	};

	/**
	 * Normalises text by trimming and replacing multiple spaces or line breaks.
	 */
	private normaliseText(text: string): string {
		return text.trim().replace(/\s+/g, ' ');
	}

	/**
	 * Gets the label text for a radio input.
	 */
	private async getRadioLabelText(input: Locator): Promise<string> {
		const inputId = await input.getAttribute('id');

		if (!inputId) {
			throw new Error(`Radio input in group '${this.radioName}' does not have an id`);
		}

		const label = this.page.locator(`label[for="${inputId}"]`);

		await expect(label, `Label for radio input '${inputId}' should be visible`).toBeVisible();

		return this.normaliseText(await label.innerText());
	}

	/**
	 * Finds one radio input by exact or partial label text.
	 *
	 * Fails if no option is found or if multiple options match.
	 */
	private async getInputByLabel(optionText: string, matchType: RadioLabelMatchType = 'exact'): Promise<Locator> {
		const inputs = this.locators.radioInputs();
		const count = await inputs.count();
		const matches: Locator[] = [];

		for (let index = 0; index < count; index++) {
			const input = inputs.nth(index);
			const labelText = await this.getRadioLabelText(input);
			const isMatch = matchType === 'exact' ? labelText === optionText : labelText.includes(optionText);

			if (isMatch) {
				matches.push(input);
			}
		}

		if (matches.length === 0) {
			throw new Error(
				`Test failed: No radio option ${matchType === 'exact' ? 'matching' : 'containing'} '${optionText}' was found for radio group '${this.radioName}'`
			);
		}

		if (matches.length > 1) {
			throw new Error(
				`Test failed: ${matches.length} radio options ${matchType === 'exact' ? 'matching' : 'containing'} '${optionText}' were found for radio group '${this.radioName}'. Use more specific text.`
			);
		}

		const matchedInput = matches[0];

		if (!matchedInput) {
			throw new Error(
				`Test failed: Unable to resolve radio option '${optionText}' for radio group '${this.radioName}'`
			);
		}

		return matchedInput;
	}

	public readonly assertions = {
		/**
		 * Verifies the radio group contains exactly the expected options.
		 * Matches options by exact label text, without requiring a specific order.
		 */
		hasOptions: async (expectedOptions: string[]) => {
			const inputs = this.locators.radioInputs();
			const count = await inputs.count();
			const actualOptions: string[] = [];

			for (let index = 0; index < count; index++) {
				actualOptions.push(await this.getRadioLabelText(inputs.nth(index)));
			}

			expect(actualOptions).toHaveLength(expectedOptions.length);
			expect(actualOptions).toEqual(expect.arrayContaining(expectedOptions));

			return this.assertions;
		},

		/**
		 * Verifies a radio option is selected.
		 * Finds the option by exact label text within the radio group.
		 */
		isOptionSelected: async (option: string) => {
			const input = await this.getInputByLabel(option, 'exact');

			await expect(input, `Radio option '${option}' should be selected`).toBeChecked();

			return this.assertions;
		}
	};

	public readonly actions = {
		/**
		 * Selects a radio option by exact label text.
		 */
		selectOption: async (optionText: string) => {
			const input = await this.getInputByLabel(optionText, 'exact');

			await expect(input, `Radio option '${optionText}' should be enabled`).toBeEnabled();
			await input.check();

			return this.actions;
		},

		/**
		 * Selects a radio option containing the supplied text.
		 * Fails if no option is found or if multiple options match.
		 */
		selectOptionContaining: async (text: string) => {
			const input = await this.getInputByLabel(text, 'contains');

			await expect(input, `Radio option containing '${text}' should be enabled`).toBeEnabled();
			await input.check();

			return this.actions;
		}
	};
}

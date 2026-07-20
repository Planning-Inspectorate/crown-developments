import { expect, type Locator, type Page } from '@playwright/test';

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
	 * Finds one radio input by exact label text.
	 */
	private async getInputByExactLabel(optionText: string): Promise<Locator> {
		const inputs = this.locators.radioInputs();
		const count = await inputs.count();
		const matches: Locator[] = [];

		for (let index = 0; index < count; index++) {
			const input = inputs.nth(index);
			const labelText = await this.getRadioLabelText(input);

			if (labelText === optionText) {
				matches.push(input);
			}
		}

		if (matches.length === 0) {
			throw new Error(`Test failed: No radio option '${optionText}' was found for radio group '${this.radioName}'`);
		}

		if (matches.length > 1) {
			throw new Error(
				`Test failed: ${matches.length} radio options matching '${optionText}' were found for radio group '${this.radioName}'`
			);
		}

		return matches[0];
	}

	/**
	 * Finds radio inputs by partial label text.
	 */
	private async getInputsByContainingLabel(text: string): Promise<Locator[]> {
		const inputs = this.locators.radioInputs();
		const count = await inputs.count();
		const matches: Locator[] = [];

		for (let index = 0; index < count; index++) {
			const input = inputs.nth(index);
			const labelText = await this.getRadioLabelText(input);

			if (labelText.includes(text)) {
				matches.push(input);
			}
		}

		return matches;
	}

	public readonly assertions = {
		/**
		 * Verifies the radio group contains exactly the expected options.
		 * Matches options by exact label text.
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
			const input = await this.getInputByExactLabel(option);

			await expect(input, `Radio option '${option}' should be selected`).toBeChecked();

			return this.assertions;
		}
	};

	public readonly actions = {
		/**
		 * Selects a radio option by exact label text.
		 */
		selectOption: async (optionText: string) => {
			const input = await this.getInputByExactLabel(optionText);

			await expect(input, `Radio option '${optionText}' should be enabled`).toBeEnabled();
			await input.check();

			return this.actions;
		},

		/**
		 * Selects a radio option containing the supplied text.
		 * Fails if no option is found or if multiple options match.
		 */
		selectOptionContaining: async (text: string) => {
			const matches = await this.getInputsByContainingLabel(text);

			if (matches.length === 0) {
				throw new Error(
					`Test failed: No radio option containing '${text}' was found for radio group '${this.radioName}'`
				);
			}

			if (matches.length > 1) {
				throw new Error(
					`Test failed: ${matches.length} radio options containing '${text}' were found for radio group '${this.radioName}'. Use more specific text.`
				);
			}

			await expect(matches[0], `Radio option containing '${text}' should be enabled`).toBeEnabled();
			await matches[0].check();

			return this.actions;
		}
	};
}

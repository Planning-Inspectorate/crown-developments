import { expect, type Page } from '@playwright/test';

export class RadioGroupComponent {
	private readonly page: Page;
	private readonly radioName: string;

	constructor(page: Page, radioName: string) {
		this.page = page;
		this.radioName = radioName;
	}

	public readonly assertions = {
		/**
		 * Verifies the radio group contains each expected option.
		 * Matches options by exact label text.
		 */
		hasOptions: async (expectedOptions: string[]) => {
			const radioInputs = this.page.locator(`input[type="radio"][name="${this.radioName}"]`);
			const radioCount = await radioInputs.count();

			expect(radioCount, `Radio group '${this.radioName}' should contain at least one option`).toBeGreaterThan(0);

			for (const expectedOption of expectedOptions) {
				let matchingRadioId: string | undefined;

				for (let index = 0; index < radioCount; index++) {
					const radio = radioInputs.nth(index);
					const radioId = await radio.getAttribute('id');

					if (!radioId) {
						continue;
					}

					const label = this.page.locator(`label[for="${radioId}"]`).first();

					if ((await label.count()) === 0) {
						continue;
					}

					const labelText = (await label.innerText()).trim().replace(/\s+/g, ' ');

					if (labelText === expectedOption) {
						matchingRadioId = radioId;
						break;
					}
				}

				if (!matchingRadioId) {
					throw new Error(
						`Test failed: Radio option '${expectedOption}' was not found for radio group '${this.radioName}'`
					);
				}

				await expect(
					this.page.locator(`#${matchingRadioId}`),
					`Radio option '${expectedOption}' should be attached`
				).toBeAttached();

				await expect(
					this.page.locator(`label[for="${matchingRadioId}"]`),
					`Radio label '${expectedOption}' should be visible`
				).toBeVisible();
			}

			return this.assertions;
		},

		/**
		 * Verifies a radio option is selected.
		 * Finds the option by exact label text within the radio group.
		 */
		isOptionSelected: async (option: string) => {
			const radioInputs = this.page.locator(`input[type="radio"][name="${this.radioName}"]`);
			const radioCount = await radioInputs.count();

			let matchingRadioId: string | undefined;

			for (let index = 0; index < radioCount; index++) {
				const radio = radioInputs.nth(index);
				const radioId = await radio.getAttribute('id');

				if (!radioId) {
					continue;
				}

				const label = this.page.locator(`label[for="${radioId}"]`).first();

				if ((await label.count()) === 0) {
					continue;
				}

				const labelText = (await label.innerText()).trim().replace(/\s+/g, ' ');

				if (labelText === option) {
					matchingRadioId = radioId;
					break;
				}
			}

			if (!matchingRadioId) {
				throw new Error(`Test failed: Radio option '${option}' was not found for radio group '${this.radioName}'`);
			}

			await expect(
				this.page.locator(`#${matchingRadioId}`),
				`Radio option '${option}' should be selected`
			).toBeChecked();

			return this.assertions;
		}
	};

	public readonly actions = {
		/**
		 * Selects a radio option containing the supplied text.
		 * Fails if no option is found or if multiple options match.
		 */
		selectOptionContaining: async (text: string) => {
			const radioInputs = this.page.locator(`input[type="radio"][name="${this.radioName}"]`);
			const radioCount = await radioInputs.count();

			let matchingRadioId: string | undefined;
			let matchingLabelText: string | undefined;
			let matchCount = 0;

			for (let index = 0; index < radioCount; index++) {
				const radio = radioInputs.nth(index);
				const radioId = await radio.getAttribute('id');

				if (!radioId) {
					continue;
				}

				const label = this.page.locator(`label[for="${radioId}"]`).first();

				if ((await label.count()) === 0) {
					continue;
				}

				const labelText = (await label.innerText()).trim().replace(/\s+/g, ' ');

				if (labelText.includes(text)) {
					matchCount += 1;

					if (!matchingRadioId) {
						matchingRadioId = radioId;
						matchingLabelText = labelText;
					}
				}
			}

			if (matchCount === 0) {
				throw new Error(
					`Test failed: No radio option containing '${text}' was found for radio group '${this.radioName}'`
				);
			}

			if (matchCount > 1) {
				throw new Error(
					`Test failed: ${matchCount} radio options containing '${text}' were found for radio group '${this.radioName}'. Use more specific text.`
				);
			}

			if (!matchingRadioId) {
				throw new Error(
					`Test failed: Radio option containing '${text}' could not be resolved for radio group '${this.radioName}'`
				);
			}

			const radio = this.page.locator(`#${matchingRadioId}`);
			const label = this.page.locator(`label[for="${matchingRadioId}"]`);

			await expect(label, `Radio label '${matchingLabelText}' should be visible before selecting`).toBeVisible();
			await radio.check();
			await expect(radio, `Radio option '${matchingLabelText}' should be selected`).toBeChecked();

			return this.actions;
		}
	};
}

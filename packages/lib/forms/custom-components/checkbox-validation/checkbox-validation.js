/**
 * checkbox values and error messages
 * Converts submitted checkbox values to an array of strings.
 */
export const declarationItems = [
	{
		value: 'consent',
		text: 'I consent to my name, comment and supporting documents being published on this website',
		errorMessage: 'Select that you agree to publish your name, comment and supporting documents'
	},
	{
		value: 'connect',
		text: 'The Planning Inspectorate may contact me by email about my comment and supporting documents',
		errorMessage: 'Select that you agree to be contacted by email about your comment and documents'
	},
	{
		value: 'read',
		html: "I have read and understood the <a href='https://www.gov.uk/government/publications/planning-inspectorate-privacy-notices/customer-privacy-notice'>Customer Privacy Notice</a>",
		errorMessage: 'Select that you have read and understood the Customer Privacy Notice'
	}
];
/**
 * Converts submitted checkbox values to a normalised array of strings.
 * @param {string|string[]|undefined} submitted
 * @returns {string[]}
 */
export function normaliseCheckboxValues(submitted) {
	if (Array.isArray(submitted)) {
		return submitted;
	}
	if (typeof submitted === 'string' && submitted.trim()) {
		return [submitted];
	}
	return [];
}

/**
 * Simple checkbox validator with a group-level default message.
 */
export class CheckboxValidator {
	/**
	 * @param {string} inputLabel - UI label used to build default error messages
	 * @param {{ emptyErrorMessage?: string }} [errorMessages]
	 */
	constructor(inputLabel, errorMessages = {}) {
		const baseLabel = inputLabel?.toLowerCase() || 'checkboxes';
		this.emptyErrorMessage = errorMessages.emptyErrorMessage || `Select all ${baseLabel} to continue`;
	}

	/**
	 * Returns the message for an unchecked item (falls back to group-level message).
	 * @param {{ value:string, errorMessage?:string }} item
	 * @returns {string}
	 */
	getItemMessage(item) {
		return item?.errorMessage || this.emptyErrorMessage;
	}
}

/**
 * Validates which required checkboxes are missing.
 * @param {string[]|string|undefined} submitted
 * @param {{ value:string, errorMessage?:string }[]} items
 * @param {CheckboxValidator} validator
 * @returns {{ value:string, message:string }[]}
 */
export function validateRequiredCheckboxGroup(submitted, items, validator) {
	const selectedValues = normaliseCheckboxValues(submitted);
	const errors = [];
	for (const item of items) {
		if (!selectedValues.includes(item.value)) {
			errors.push({ value: item.value, message: validator.getItemMessage(item) });
		}
	}
	return errors;
}

/**
 * Builds an object for rendering and error summary.
 * govukCheckboxes renders rich label content via item.html; we append an error span when unchecked.
 * @param {string[]|string|undefined} submitted
 * @param {{ value:string, text?:string, html?:string, errorMessage?:string }[]} items
 * @param {{ idPrefix?: string, validator: CheckboxValidator }} opts
 * @returns {{
 *   items: Array<{ value:string, text?:string, html?:string, checked:boolean }>,
 *   errors: { value:string, message:string }[],
 *   errorSummary: { text:string, href:string }[],
 *   valid: boolean
 * }}
 */
export function buildRequiredCheckboxGroup(submitted, items, { idPrefix = 'checkbox', validator } = {}) {
	const selectedValues = normaliseCheckboxValues(submitted);
	const errors = validateRequiredCheckboxGroup(submitted, items, validator);

	const stateItems = items.map((item) => {
		const checked = selectedValues.includes(item.value);
		const msg = checked ? undefined : validator.getItemMessage(item);

		// Build label HTML: original text/html plus an inline error span when unchecked
		let labelHtml = item.html ?? item.text ?? '';
		if (!checked && msg) {
			labelHtml = `${labelHtml} <span class="govuk-error-message"><span class="govuk-visually-hidden">Error: </span>${msg}</span>`;
		}

		return {
			...item,
			checked,
			html: labelHtml,
			text: item.html ? undefined : item.text
		};
	});

	const errorSummary = errors.map((e) => ({
		text: e.message,
		href: `#${idPrefix}-${e.value}`
	}));

	return {
		items: stateItems,
		errors,
		errorSummary,
		valid: errors.length === 0
	};
}

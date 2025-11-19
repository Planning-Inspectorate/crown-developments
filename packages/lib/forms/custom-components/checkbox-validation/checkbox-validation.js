/**
 * Converts submitted checkbox values to an array of strings.
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
 * Checks which required checkboxes are missing.
 * Returns an array of error objects: { value, message }
 */
export function validateRequiredCheckboxGroup(submitted, items) {
	const selectedValues = normaliseCheckboxValues(submitted);
	const errors = [];
	for (const item of items) {
		const isChecked = selectedValues.includes(item.value);
		if (!isChecked) {
			const message =
				(item.validators && item.validators[0] && item.validators[0].message) ||
				item.errorMessage ||
				'This item is required';
			errors.push({ value: item.value, message });
		}
	}
	return errors;
}

/**
 * Returns true if all required checkboxes are selected, false otherwise.
 */
export function isValidRequiredCheckboxGroup(submitted, items) {
	const errors = validateRequiredCheckboxGroup(submitted, items);
	return errors.length === 0;
}

/**
 * Builds a state object for rendering and error summary.
 */
export function buildRequiredCheckboxGroup(submitted, items, { idPrefix = 'checkbox' } = {}) {
	const selectedValues = normaliseCheckboxValues(submitted);
	const errors = validateRequiredCheckboxGroup(submitted, items);

	const stateItems = items.map((item) => {
		const checked = selectedValues.includes(item.value);
		let errorMessage;
		if (!checked) {
			const msg =
				(item.validators && item.validators[0] && item.validators[0].message) ||
				item.errorMessage ||
				'This item is required';
			errorMessage = { text: msg };
		}
		return {
			...item,
			checked,
			errorMessage
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

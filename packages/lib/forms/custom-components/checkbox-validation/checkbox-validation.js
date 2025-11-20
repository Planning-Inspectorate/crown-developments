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
export function normaliseCheckboxValues(submitted) {
	if (Array.isArray(submitted)) {
		return submitted;
	}
	if (typeof submitted === 'string' && submitted.trim()) {
		return [submitted];
	}
	return [];
}

export function renderDeclaration(res, applicationId, items, errorSummary = undefined) {
	return res.render('views/applications/view/have-your-say/declaration.njk', {
		pageTitle: 'Declaration',
		id: applicationId,
		backLinkUrl: 'check-your-answers',
		declarationItems: items,
		errorSummary,
		errors: errorSummary,
		...(res.req?.app?.locals?.config ? { config: res.req.app.locals.config } : {})
	});
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

/**
 *  middleware for the Have Your Say declaration POST.
 */
export function haveYourSayDeclarationValidation(req, res, next) {
	if (req.method !== 'POST') {
		return next();
	}
	const applicationId = req.params?.applicationId;
	const submitted = req.body?.declaration;
	const group = buildRequiredCheckboxGroup(submitted, declarationItems, {
		idPrefix: 'declaration'
	});

	if (!group.valid) {
		res.locals = res.locals || {};
		res.locals.errorSummary = group.errorSummary;
		if (typeof res.status === 'function') {
			res.status(400);
		}
		return renderDeclaration(res, applicationId, group.items, group.errorSummary);
	}
	req.body.declaration = normaliseCheckboxValues(submitted);
	return next();
}

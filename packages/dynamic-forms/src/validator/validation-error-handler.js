import { validationResult } from 'express-validator';

/**
 * @typedef {{text: string, href: string}[]} GovUkErrorList
 * @typedef {Object<string, import('express-validator').ValidationError>} ExpressValidationErrors
 * @typedef {(errors: ExpressValidationErrors) => GovUkErrorList} ToErrorSummary
 */

/**
 * @type {ToErrorSummary}
 */
export const expressValidationErrorsToGovUkErrorList = (expressValidationErrors) => {
	/** @type {GovUkErrorList} */
	const mappedErrors = [];

	if (Object.keys(expressValidationErrors).length === 0) {
		return mappedErrors;
	}

	Object.keys(expressValidationErrors).forEach((key) => {
		mappedErrors.push({
			text: expressValidationErrors[key].msg,
			href: `#${key}`
		});
	});

	return mappedErrors;
};

/**
 *
 * @param {import('express-validator').ResultFactory<import('express-validator').ValidationError>} [validate] - for testing
 * @param {ToErrorSummary} [toErrorSummary] - for testing
 * @returns {import('express').Handler}
 */
export const buildValidationErrorHandler = (
	validate = validationResult,
	toErrorSummary = expressValidationErrorsToGovUkErrorList
) => {
	return (req, res, next) => {
		let errors = validate(req);

		if (errors.isEmpty()) {
			return next();
		}

		const mappedErrors = errors.mapped();

		// date-validator returns some empty error messages to avoid having an error for each field
		// there is probably a better way but we shouldn't block with an empty error anyway
		const filteredErrors = Object.entries(mappedErrors).filter(([, error]) => error.msg);
		if (filteredErrors.length === 0) return next();

		const mappedAndFilteredErrors = Object.fromEntries(filteredErrors);

		req.body.errors = mappedAndFilteredErrors;
		req.body.errorSummary = toErrorSummary(mappedAndFilteredErrors);

		return next();
	};
};

export const validationErrorHandler = buildValidationErrorHandler();

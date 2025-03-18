import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

const validatePostcode = (postcode, errorMessage = 'Enter a valid postcode') => {
	const pattern =
		/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/;
	const result = pattern.exec(postcode);
	if (!result) {
		throw new Error(errorMessage);
	}
	return postcode;
};

// todo: sort out config
export const addressLine1MaxLength = 250;
export const addressLine1MinLength = 0;
export const addressLine2MaxLength = 250;
export const addressLine2MinLength = 0;
export const townCityMaxLength = 250;
export const townCityMinLength = 0;
export const countyMaxLength = 250;
export const countyMinLength = 0;
export const postcodeMaxLength = 10;
export const postcodeMinLength = 0;

/**
 * enforces address fields are within allowed parameters
 * @class
 */
export default class AddressValidator extends BaseValidator {
	/**
	 * creates an instance of an AddressValidator
	 * @param {Object} opts
	 * @param {boolean} [opts.required]
	 * @param {{[key: string]: boolean}} [opts.requiredFields]
	 */
	constructor(opts) {
		super();
		this.requiredFields = opts?.requiredFields;
	}

	/**
	 * validates response body using questionObj fieldname
	 * @param {Question} questionObj
	 */
	validate(questionObj) {
		const fieldName = questionObj.fieldName;

		return [
			this.#addressLine1Rule(fieldName),
			this.#addressLine2Rule(fieldName),
			this.#townCityRule(fieldName),
			this.#countyRule(fieldName),
			this.#postCodeRule(fieldName)
		];
	}

	/**
	 * a validation chain for addressLine1
	 * @param {string} fieldName
	 */
	#addressLine1Rule(fieldName) {
		const validator = body(fieldName + '_addressLine1');

		if (!this.requiredFields?.addressLine1) {
			validator.optional({ checkFalsy: true });
		} else {
			validator.notEmpty().withMessage(`Enter an address line 1`);
		}

		return validator
			.isLength({ min: addressLine1MinLength, max: addressLine1MaxLength })
			.bail()
			.withMessage(`Address line 1 must be ${addressLine1MaxLength} characters or less`);
	}

	/**
	 * a validation chain for addressLine2
	 * @param {string} fieldName
	 */
	#addressLine2Rule(fieldName) {
		const validator = body(fieldName + '_addressLine2');
		if (!this.requiredFields?.addressLine2) {
			validator.optional({ checkFalsy: true });
		} else {
			validator.notEmpty().withMessage(`Enter an address line 2`);
		}

		return validator
			.isLength({ min: addressLine2MinLength, max: addressLine2MaxLength })
			.bail()
			.withMessage(`Address line 2 must be ${addressLine2MaxLength} characters or less`);
	}

	/**
	 * a validation chain for townCity
	 * @param {string} fieldName
	 */
	#townCityRule(fieldName) {
		const validator = body(fieldName + '_townCity');
		if (!this.requiredFields?.townCity) {
			validator.optional({ checkFalsy: true });
		} else {
			validator.notEmpty().withMessage(`Enter a town or city`);
		}
		return validator
			.isLength({ min: townCityMinLength, max: townCityMaxLength })
			.bail()
			.withMessage(`Town or city must be ${townCityMaxLength} characters or less`);
	}

	/**
	 * a validation chain for county
	 * @param {string} fieldName
	 */
	#countyRule(fieldName) {
		const validator = body(fieldName + '_county');
		if (!this.requiredFields?.county) {
			validator.optional({ checkFalsy: true });
		} else {
			validator.notEmpty().withMessage(`Enter a county`);
		}

		return validator
			.isLength({ min: countyMinLength, max: countyMaxLength })
			.bail()
			.withMessage(`County must be ${countyMaxLength} characters or less`);
	}

	/**
	 * a validation chain for postcode
	 * @param {string} fieldName
	 */
	#postCodeRule(fieldName) {
		const validator = body(fieldName + '_postcode');
		if (!this.requiredFields?.postcode) {
			validator.optional({ checkFalsy: true });
		} else {
			validator.notEmpty().withMessage(`Enter a postcode`);
		}

		return validator
			.isLength({ min: postcodeMinLength, max: postcodeMaxLength })
			.bail()
			.withMessage(`Postcode must be between ${postcodeMinLength} and ${postcodeMaxLength} characters`)
			.custom((postcode) => {
				return validatePostcode(postcode);
			});
	}

	isRequired() {
		if (this.requiredFields) {
			return Object.values(this.requiredFields).some((field) => Boolean(field));
		}
		return false;
	}
}

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
	 */
	constructor() {
		super();
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
		return body(fieldName + '_addressLine1')
			.optional({ checkFalsy: true })
			.isLength({ min: addressLine1MinLength, max: addressLine1MaxLength })
			.bail()
			.withMessage(`Address line 1 must be ${addressLine1MaxLength} characters or less`);
	}

	/**
	 * a validation chain for addressLine2
	 * @param {string} fieldName
	 */
	#addressLine2Rule(fieldName) {
		return body(fieldName + '_addressLine2')
			.optional({ checkFalsy: true })
			.isLength({ min: addressLine2MinLength, max: addressLine2MaxLength })
			.bail()
			.withMessage(`Address line 2 must be ${addressLine2MaxLength} characters or less`);
	}

	/**
	 * a validation chain for townCity
	 * @param {string} fieldName
	 */
	#townCityRule(fieldName) {
		return body(fieldName + '_townCity')
			.optional({ checkFalsy: true })
			.isLength({ min: townCityMinLength, max: townCityMaxLength })
			.bail()
			.withMessage(`Town or city must be ${townCityMaxLength} characters or less`);
	}

	/**
	 * a validation chain for county
	 * @param {string} fieldName
	 */
	#countyRule(fieldName) {
		return body(fieldName + '_county')
			.optional({ checkFalsy: true })
			.isLength({ min: countyMinLength, max: countyMaxLength })
			.bail()
			.withMessage(`County must be ${countyMaxLength} characters or less`);
	}

	/**
	 * a validation chain for postcode
	 * @param {string} fieldName
	 */
	#postCodeRule(fieldName) {
		return body(fieldName + '_postcode')
			.optional({ checkFalsy: true })
			.isLength({ min: postcodeMinLength, max: postcodeMaxLength })
			.bail()
			.withMessage(`Postcode must be between ${postcodeMinLength} and ${postcodeMaxLength} characters`)
			.custom((postcode) => {
				return validatePostcode(postcode);
			});
	}
}

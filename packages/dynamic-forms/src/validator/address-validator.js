import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

const validatePostcode = (postcode, errorMessage = 'Enter a full UK postcode') => {
	const pattern =
		/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/;
	const result = pattern.exec(postcode);
	if (!result) {
		throw new Error(errorMessage);
	}
	return postcode;
};

// todo: sort out config
export const addressLine1MaxLength = 100;
export const addressLine1MinLength = 2;
export const addressLine2MaxLength = 100;
export const addressLine2MinLength = 0;
export const townCityMaxLength = 100;
export const townCityMinLength = 2;
export const countyMaxLength = 100;
export const countyMinLength = 0;
export const postcodeMaxLength = 100;
export const postcodeMinLength = 2;

/**
 * enforces address fields are within allowed parameters
 * @class
 */
export default class AddressValidator extends BaseValidator {
	/**
	 * creates an instance of an AddressValidator
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
			.notEmpty()
			.bail()
			.withMessage('Enter address line 1')
			.isLength({ min: addressLine1MinLength, max: addressLine1MaxLength })
			.bail()
			.withMessage(`The address line must be ${addressLine1MaxLength} characters or fewer`);
	}

	/**
	 * a validation chain for addressLine2
	 * @param {string} fieldName
	 */
	#addressLine2Rule(fieldName) {
		return body(fieldName + '_addressLine2')
			.optional()
			.isLength({ min: addressLine2MinLength, max: addressLine2MaxLength })
			.bail()
			.withMessage(`The address line must be ${addressLine2MaxLength} characters or fewer`);
	}

	/**
	 * a validation chain for townCity
	 * @param {string} fieldName
	 */
	#townCityRule(fieldName) {
		return body(fieldName + '_townCity')
			.notEmpty()
			.bail()
			.withMessage('Enter town or city')
			.isLength({ min: townCityMinLength, max: townCityMaxLength })
			.bail()
			.withMessage(`Town or city must be ${townCityMaxLength} characters or fewer`);
	}

	/**
	 * a validation chain for county
	 * @param {string} fieldName
	 */
	#countyRule(fieldName) {
		return body(fieldName + '_county')
			.optional()
			.isLength({ min: countyMinLength, max: countyMaxLength })
			.bail()
			.withMessage(`The county must be ${countyMaxLength} characters or fewer`);
	}

	/**
	 * a validation chain for postcode
	 * @param {string} fieldName
	 */
	#postCodeRule(fieldName) {
		return body(fieldName + '_postcode')
			.notEmpty()
			.bail()
			.withMessage('Enter postcode')
			.isLength({ min: postcodeMinLength, max: postcodeMaxLength })
			.bail()
			.withMessage('Enter a full UK postcode')
			.if(body(fieldName + '_postcode').notEmpty())
			.custom((postcode) => validatePostcode(postcode));
	}
}

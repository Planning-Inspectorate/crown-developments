import BaseValidator from './base-validator.js';
import { body } from 'express-validator';

export const requiredCoordinateLength = 6;

/**
 * @typedef {Object} CoordinateField
 * @property {string} title
 * @property {string} fieldName
 */
export default class CoordinatesValidator extends BaseValidator {
	/**
	 * @param {CoordinateField} northing
	 * @param {CoordinateField} easting
	 */
	constructor(northing, easting) {
		super();
		this.northing = northing;
		this.easting = easting;
	}

	validate() {
		return [
			body(this.northing.fieldName)
				.optional({ checkFalsy: true })
				.isNumeric()
				.withMessage(`Please a numeric value for the Grid reference ${this.northing.title}`)
				.isLength({ min: requiredCoordinateLength, max: requiredCoordinateLength })
				.withMessage(`Enter ${requiredCoordinateLength} digits for the Grid reference ${this.northing.title}`),

			body(this.easting.fieldName)
				.optional({ checkFalsy: true })
				.isNumeric()
				.withMessage(`Please a numeric value for the Grid reference ${this.easting.title}`)
				.isLength({ min: requiredCoordinateLength, max: requiredCoordinateLength })
				.withMessage(`Enter ${requiredCoordinateLength} digits for the Grid reference ${this.easting.title}`),

			// validate northing has been populated if value for easting provided
			body(this.northing.fieldName).custom((_, { req }) => {
				const { siteNorthing, siteEasting } = req.body;
				if (!siteNorthing && siteEasting) {
					throw new Error(`Enter 6 digits for the Grid reference ${this.northing.title}`);
				}
				return true;
			}),

			// validate easting has been populated if value for northing provided
			body(this.easting.fieldName).custom((_, { req }) => {
				const { siteNorthing, siteEasting } = req.body;
				if (siteNorthing && !siteEasting) {
					throw new Error(`Enter 6 digits for the Grid reference ${this.easting.title}`);
				}
				return true;
			})
		];
	}
}

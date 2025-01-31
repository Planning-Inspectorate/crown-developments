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
	 * @param {CoordinateField} [params.coordinateFields]
	 * @param {CoordinateField} [params.coordinateFields]
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
				.isLength({ min: requiredCoordinateLength, max: requiredCoordinateLength })
				.withMessage(`Enter ${requiredCoordinateLength} digits for the Grid reference ${this.northing.title}`),

			body(this.easting.fieldName)
				.optional({ checkFalsy: true })
				.isLength({ min: requiredCoordinateLength, max: requiredCoordinateLength })
				.withMessage(`Enter ${requiredCoordinateLength} digits for the Grid reference ${this.easting.title}`),

			// validate northing has been populated if value for easting provided
			body(this.northing.fieldName).custom((_, { req }) => {
				const { siteNorthing, siteEasting } = req.body;
				if (!siteNorthing && siteEasting) {
					throw new Error(`${this.northing.title} value required to form coordinates`);
				}
				return true;
			}),

			// validate easting has been populated if value for northing provided
			body(this.easting.fieldName).custom((_, { req }) => {
				const { siteNorthing, siteEasting } = req.body;
				if (siteNorthing && !siteEasting) {
					throw new Error(`${this.easting.title} value required to form coordinates`);
				}
				return true;
			})
		];
	}
}

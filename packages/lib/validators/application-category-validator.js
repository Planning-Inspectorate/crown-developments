import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';

/**
 * Validator for application category combination rules.
 * Ensures invalid combinations of EIA, development plan, and right of way are caught.
 */
export default class ApplicationCategoryValidator extends BaseValidator {
	/**
	 * @param {Object} questionObj
	 * @returns {import('express-validator').ValidationChain[]}
	 */
	validate(questionObj) {
		this._questionObj = questionObj;
		return [
			body('environmentalImpactAssessment')
				.notEmpty()
				.withMessage('Select whether this application is an Environmental Impact Assessment (EIA) development')
				.custom((value, { req }) => {
					// Validate EIA Development Plan
					if (req.body.environmentalImpactAssessment === 'yes' && req.body.developmentPlan === 'yes') {
						throw new Error(
							'Applications cannot accord with the development plan and be an Environmental Impact Assessment development'
						);
					}
					return true;
				}),

			// Validate Development Plan
			body('developmentPlan')
				.notEmpty()
				.withMessage('Select whether this application accords with the development plan'),

			// Validate Right of Way
			body('rightOfWay')
				.notEmpty()
				.withMessage('Select whether this application involves a right of way')
				.custom((value, { req }) => {
					// Validate Right of Way + Development Plan combination
					if (req.body.rightOfWay === 'yes' && req.body.developmentPlan === 'yes') {
						throw new Error('Applications cannot accord with the development plan and involve a right of way');
					}
					return true;
				})
		];
	}
}

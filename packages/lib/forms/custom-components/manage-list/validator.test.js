import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import CustomManageListValidator from './validator.js';

describe('Validator for manage-list custom component', () => {
	it('should pass when minimumAnswers is met using validate().run(req)', async () => {
		const validator = new CustomManageListValidator({
			minimumAnswers: 1,
			errorMessages: { minimumAnswers: 'At least one applicant organisation is required' }
		});
		const questionObj = { fieldName: 'manageApplicantDetails' };

		const req = {
			res: {
				locals: {
					journeyResponse: {
						answers: {
							manageApplicantDetails: [{ organisationName: 'Org A', organisationAddress: { line1: 'Address 1' } }]
						}
					}
				}
			}
		};

		const chain = validator.validate(questionObj);
		await chain.run(req);
		const result = validationResult(req);
		assert.equal(result.isEmpty(), true);
	});

	it('should fail when array is empty using validate().run(req)', async () => {
		const validator = new CustomManageListValidator({
			minimumAnswers: 2,
			errorMessages: { minimumAnswers: 'Add at least 2 items' }
		});
		const questionObj = { fieldName: 'manageApplicantDetails' };

		const req = {
			res: {
				locals: {
					journeyResponse: {
						answers: {
							manageApplicantDetails: []
						}
					}
				}
			}
		};

		const chain = validator.validate(questionObj);
		await chain.run(req);
		const result = validationResult(req);
		assert.equal(result.isEmpty(), false);
		const errors = result.array();
		assert.equal(errors[0].msg, 'Add at least 2 items');
		assert.equal(errors[0].path, 'manageApplicantDetails');
	});

	it('should fail when answers are missing (undefined) using validate().run(req)', async () => {
		const validator = new CustomManageListValidator({
			minimumAnswers: 1,
			errorMessages: { minimumAnswers: 'At least one item required' }
		});
		const questionObj = { fieldName: 'manageApplicantDetails' };

		const req = {
			res: {
				locals: {
					journeyResponse: {
						answers: {
							// field missing
						}
					}
				}
			}
		};

		const chain = validator.validate(questionObj);
		await chain.run(req);
		const result = validationResult(req);
		assert.equal(result.isEmpty(), false);
		const errors = result.array();
		assert.equal(errors[0].msg, 'At least one item required');
	});
	describe('checkArrayHasEnoughItems', () => {
		it('should return true when array length >= minimumAnswers', () => {
			const validator = new CustomManageListValidator({ minimumAnswers: 2 });
			const ok = validator.checkArrayHasEnoughItems(
				[{ organisationName: 'Org A' }, { organisationName: 'Org B' }],
				'Add at least 2 items'
			);
			assert.equal(ok, true);
		});

		it('should throw with message when array too short', () => {
			const validator = new CustomManageListValidator({ minimumAnswers: 2 });
			assert.throws(
				() => validator.checkArrayHasEnoughItems([{ organisationName: 'Only One' }], 'Add at least 2 items'),
				{
					name: 'Error',
					message: 'Add at least 2 items'
				}
			);
		});

		it('should throw when not an array', () => {
			const validator = new CustomManageListValidator({ minimumAnswers: 1 });
			assert.throws(() => validator.checkArrayHasEnoughItems(undefined, 'At least one item required'), {
				name: 'Error',
				message: 'At least one item required'
			});
		});
		it('should default to minimumAnswers of 1 when undefined', () => {
			const validator = new CustomManageListValidator();
			assert.throws(() => validator.checkArrayHasEnoughItems([], 'At least one item required'), {
				name: 'Error',
				message: 'At least one item required'
			});
		});
	});
});

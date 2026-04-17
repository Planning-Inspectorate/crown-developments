import { describe, it } from 'node:test';
import assert from 'node:assert';
import ApplicationCategoryValidator from './application-category-validator.js';
import { validationResult } from 'express-validator';

describe('ApplicationCategoryValidator', () => {
	const createMockRequest = (body) => ({
		body
	});

	const runValidation = async (validationChains, req) => {
		for (const validation of validationChains) {
			await validation.run(req);
		}
		return validationResult(req);
	};

	it('should allow valid combination with all no answers', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'no',
			developmentPlan: 'no',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), true);
	});

	it('should allow valid combination with all yes answers except development plan', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'no',
			rightOfWay: 'yes'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), true);
	});

	it('should allow valid combination with EIA yes and development plan no', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'no',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), true);
	});

	it('should allow valid combination with right of way yes and development plan no', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'no',
			developmentPlan: 'no',
			rightOfWay: 'yes'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), true);
	});

	it('should allow valid combination with only development plan yes', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'no',
			developmentPlan: 'yes',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), true);
	});

	it('should reject invalid combination when EIA yes and development plan yes', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'yes',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].path, 'environmentalImpactAssessment');
		assert.strictEqual(
			errors[0].msg,
			'Applications cannot accord with the development plan and be an Environmental Impact Assessment development'
		);
	});

	it('should reject invalid combination when right of way yes and development plan yes', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'no',
			developmentPlan: 'yes',
			rightOfWay: 'yes'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].path, 'rightOfWay');
		assert.strictEqual(
			errors[0].msg,
			'Applications cannot accord with the development plan and involve a right of way'
		);
	});

	it('should reject both invalid combinations when all three are yes', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'yes',
			rightOfWay: 'yes'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		assert.strictEqual(errors.length, 2);

		const eiaError = errors.find((e) => e.path === 'environmentalImpactAssessment');
		assert.ok(eiaError);
		assert.strictEqual(
			eiaError.msg,
			'Applications cannot accord with the development plan and be an Environmental Impact Assessment development'
		);

		const rowError = errors.find((e) => e.path === 'rightOfWay');
		assert.ok(rowError);
		assert.strictEqual(rowError.msg, 'Applications cannot accord with the development plan and involve a right of way');
	});

	it('should only validate when both fields in combination are yes', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'no',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), true);
	});

	it('should validate EIA and development plan independently of right of way', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'yes',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].path, 'environmentalImpactAssessment');
	});

	it('should validate right of way and development plan independently of EIA', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'no',
			developmentPlan: 'yes',
			rightOfWay: 'yes'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].path, 'rightOfWay');
	});

	it('should reject when EIA field is not selected', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: '',
			developmentPlan: 'yes',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		const eiaError = errors.find((e) => e.path === 'environmentalImpactAssessment');
		assert.ok(eiaError);
		assert.strictEqual(
			eiaError.msg,
			'Select whether this application is an Environmental Impact Assessment (EIA) development'
		);
	});

	it('should reject when development plan field is not selected', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: '',
			rightOfWay: 'no'
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		const devPlanError = errors.find((e) => e.path === 'developmentPlan');
		assert.ok(devPlanError);
		assert.strictEqual(devPlanError.msg, 'Select whether this application accords with the development plan');
	});

	it('should reject when right of way field is not selected', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'no',
			rightOfWay: ''
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		const rowError = errors.find((e) => e.path === 'rightOfWay');
		assert.ok(rowError);
		assert.strictEqual(rowError.msg, 'Select whether this application involves a right of way');
	});

	it('should reject when multiple fields are not selected', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: '',
			developmentPlan: '',
			rightOfWay: ''
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();
		assert.strictEqual(errors.length, 3);

		assert.ok(errors.find((e) => e.path === 'environmentalImpactAssessment'));
		assert.ok(errors.find((e) => e.path === 'developmentPlan'));
		assert.ok(errors.find((e) => e.path === 'rightOfWay'));
	});

	it('should show both required and combination errors when applicable', async () => {
		const validator = new ApplicationCategoryValidator();
		const validationChains = validator.validate({});
		const req = createMockRequest({
			environmentalImpactAssessment: 'yes',
			developmentPlan: 'yes',
			rightOfWay: ''
		});

		const result = await runValidation(validationChains, req);
		assert.strictEqual(result.isEmpty(), false);
		const errors = result.array();

		// Should have required error for rightOfWay and combination error for EIA
		assert.ok(errors.length >= 2);
		assert.ok(errors.find((e) => e.path === 'rightOfWay' && e.msg.includes('Select whether')));
		assert.ok(errors.find((e) => e.path === 'environmentalImpactAssessment'));
	});
});

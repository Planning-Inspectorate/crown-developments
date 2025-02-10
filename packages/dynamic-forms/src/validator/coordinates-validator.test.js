import { describe, it } from 'node:test';
import assert from 'node:assert';
import CoordinatesValidator from './coordinates-validator.js';
import { validationResult } from 'express-validator';

const northing = { title: 'Northing', fieldName: 'siteNorthing' };
const easting = { title: 'Easting', fieldName: 'siteEasting' };

describe('./src/dynamic-forms/validator/coordinates-validator.js', () => {
	it('should not return an error message if both coordinates are empty', async () => {
		const req = {
			body: {
				siteNorthing: '',
				siteEasting: ''
			}
		};
		const coordinatesValidator = new CoordinatesValidator(northing, easting);

		const errors = await _validationMappedErrors(req, coordinatesValidator);

		assert.strictEqual(Object.keys(errors).length, 0);
	});

	it('should return an error message if coordinates are not the required length', async () => {
		const req = {
			body: {
				siteNorthing: '123',
				siteEasting: '456'
			}
		};
		const coordinatesValidator = new CoordinatesValidator(northing, easting);

		const errors = await _validationMappedErrors(req, coordinatesValidator);

		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[northing.fieldName].msg, `Enter 6 digits for the Grid reference ${northing.title}`);
		assert.strictEqual(errors[easting.fieldName].msg, `Enter 6 digits for the Grid reference ${easting.title}`);
	});

	it('should return an error message if northing is populated but easting is not', async () => {
		const req = {
			body: {
				siteNorthing: '123456',
				siteEasting: ''
			}
		};
		const coordinatesValidator = new CoordinatesValidator(northing, easting);

		const errors = await _validationMappedErrors(req, coordinatesValidator);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[easting.fieldName].msg, `Enter 6 digits for the Grid reference ${easting.title}`);
	});

	it('should return an error message if easting is populated but northing is not', async () => {
		const req = {
			body: {
				siteNorthing: '',
				siteEasting: '123456'
			}
		};
		const coordinatesValidator = new CoordinatesValidator(northing, easting);

		const errors = await _validationMappedErrors(req, coordinatesValidator);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[northing.fieldName].msg, `Enter 6 digits for the Grid reference ${northing.title}`);
	});

	it('should return an error message if northing is populated but not required length and easting is not populated', async () => {
		const req = {
			body: {
				siteNorthing: '1234',
				siteEasting: ''
			}
		};
		const coordinatesValidator = new CoordinatesValidator(northing, easting);

		const errors = await _validationMappedErrors(req, coordinatesValidator);

		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[northing.fieldName].msg, `Enter 6 digits for the Grid reference ${northing.title}`);
		assert.strictEqual(errors[easting.fieldName].msg, `Enter 6 digits for the Grid reference ${easting.title}`);
	});

	it('should return an error message if easting is populated but not required length and northing is not populated', async () => {
		const req = {
			body: {
				siteNorthing: '',
				siteEasting: '12'
			}
		};
		const coordinatesValidator = new CoordinatesValidator(northing, easting);

		const errors = await _validationMappedErrors(req, coordinatesValidator);

		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[northing.fieldName].msg, `Enter 6 digits for the Grid reference ${northing.title}`);
		assert.strictEqual(errors[easting.fieldName].msg, `Enter 6 digits for the Grid reference ${easting.title}`);
	});
});

const _validationMappedErrors = async (req, validator) => {
	const validationRules = validator.validate();
	await Promise.all(validationRules.map((validator) => validator.run(req)));
	const errors = validationResult(req);
	return errors.mapped();
};

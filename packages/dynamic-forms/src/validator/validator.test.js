import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import validate from './validator.js';
import RequiredValidator from './required-validator.js';
import ValidOptionValidator from './valid-option-validator.js';
import AddressValidator from './address-validator.js';

describe('./src/dynamic-forms/validator/validator.js', () => {
	let mockRes;
	beforeEach(() => {
		mockRes = {
			locals: {
				journeyResponse: {},
				journey: {
					getQuestionBySectionAndName: function () {
						return null;
					}
				}
			}
		};
	});

	it('should error with invalid question', async () => {
		const req = {
			params: {},
			body: {}
		};

		const next = mock.fn();
		let error = null;
		try {
			await validate(req, mockRes, next);
		} catch (e) {
			error = e;
		}

		assert.strictEqual(error.message, 'unknown question type');
	});

	it('should validate a single validator', async () => {
		const req = {
			params: {
				section: 1,
				question: 1,
				referenceId: 'abc'
			},
			body: {
				field1: 'bananas'
			}
		};

		mockRes.locals.journey = {
			getQuestionBySectionAndName: function () {
				return {
					validators: [new RequiredValidator()],
					fieldName: 'field1'
				};
			}
		};

		const next = mock.fn();
		await validate(req, mockRes, next);

		assert.strictEqual(req['express-validator#contexts'][0]._errors.length, 0);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should invalidate a single validator', async () => {
		const req = {
			params: {
				section: 1,
				question: 1,
				referenceId: 'abc'
			},
			body: {
				field1: ''
			}
		};

		mockRes.locals.journey = {
			getQuestionBySectionAndName: function () {
				return {
					validators: [new RequiredValidator()],
					fieldName: 'field1'
				};
			}
		};

		const next = mock.fn();
		await validate(req, mockRes, next);

		assert.strictEqual(req['express-validator#contexts'][0]._errors.length, 1);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should validate multiple validators', async () => {
		const req = {
			params: {
				section: 1,
				question: 1
			},
			body: {
				field1: 'bananas'
			}
		};

		mockRes.locals.journey = {
			getQuestionBySectionAndName: function () {
				return {
					validators: [new RequiredValidator(), new ValidOptionValidator()],
					fieldName: 'field1',
					options: [
						{
							text: 'Apples',
							value: 'apples'
						},
						{
							text: 'Pears',
							value: 'pears'
						},
						{
							text: 'Bananas',
							value: 'bananas'
						}
					]
				};
			}
		};

		const next = mock.fn();
		await validate(req, mockRes, next);

		assert.strictEqual(req['express-validator#contexts'][0]._errors.length, 0);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should invalidate some validators', async () => {
		const req = {
			params: {
				section: 1,
				question: 1
			},
			body: {
				field1: 'kumquat'
			}
		};

		mockRes.locals.journey = {
			getQuestionBySectionAndName: function () {
				return {
					validators: [new RequiredValidator(), new ValidOptionValidator()],
					fieldName: 'field1',
					options: [
						{
							text: 'Apples',
							value: 'apples'
						},
						{
							text: 'Pears',
							value: 'pears'
						},
						{
							text: 'Bananas',
							value: 'bananas'
						}
					]
				};
			}
		};

		const next = mock.fn();
		await validate(req, mockRes, next);

		assert.strictEqual(req['express-validator#contexts'][1]._errors.length, 1);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('can handle a validator that returns array of validation rules', async () => {
		const req = {
			params: {
				section: 1,
				question: 1,
				referenceId: 'abc'
			},
			body: {
				field1_addressLine1: '',
				field1_townCity: ''
			}
		};

		mockRes.locals.journey = {
			getQuestionBySectionAndName: function () {
				return {
					validators: [new AddressValidator()],
					fieldName: 'field1'
				};
			}
		};

		const next = mock.fn();
		await validate(req, mockRes, next);

		const validatorContexts = req['express-validator#contexts'];

		const getContext = (field) => validatorContexts.find((context) => context.fields[0] === field);
		const addressLine1 = getContext('field1_addressLine1');
		const addressLine2 = getContext('field1_addressLine2');
		const townCity = getContext('field1_townCity');
		const postcode = getContext('field1_postcode');

		assert.strictEqual(addressLine1._errors.length, 1);
		assert.strictEqual(addressLine2._errors.length, 0);
		assert.strictEqual(townCity._errors.length, 1);
		assert.strictEqual(postcode._errors.length, 1);
		assert.strictEqual(next.mock.callCount(), 1);
	});
});

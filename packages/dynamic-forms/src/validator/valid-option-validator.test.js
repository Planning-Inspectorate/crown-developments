import { describe, it } from 'node:test';
import assert from 'node:assert';
import ValidOptionValidator from './valid-option-validator.js';

describe('./src/dynamic-forms/validator/valid-option-validator.js', () => {
	it('should build a ValidOptionValidator', () => {
		const vov = new ValidOptionValidator();
		const rule = vov.validate({}).builder.build();
		assert.strictEqual(rule.locations[0], 'body');
		assert.strictEqual(rule.stack[0].message, vov.errorMessage);
		assert.strictEqual(rule.stack[0].validator.name, '');
	});
	it('should return an error message if the field value is not in the list of options defined on the question', async () => {
		const req = {
			body: {
				favouriteFruit: 'bananas'
			}
		};
		const errorMessage = 'Please select only from the supplied options';
		const question = {
			fieldName: 'favouriteFruit',
			options: [
				{ text: 'Apples', value: 'apples' },
				{ text: 'Pears', value: 'pears' },
				{ text: 'Oranges', values: 'oranges' }
			]
		};
		const validationResult = await new ValidOptionValidator(errorMessage).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, errorMessage);
	});

	it('should return an error message if the field value is a list and at least one element is not in the list of options defined on the question', async () => {
		const req = {
			body: {
				favouriteFruit: ['bananas', 'pears']
			}
		};
		const errorMessage = 'Please select only from the supplied options';
		const question = {
			fieldName: 'favouriteFruit',
			options: [
				{ text: 'Apples', value: 'apples' },
				{ text: 'Pears', value: 'pears' },
				{ text: 'Oranges', values: 'oranges' }
			]
		};
		const validationResult = await new ValidOptionValidator(errorMessage).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, errorMessage);
	});

	it('should not return an error message if the field value is in the list of options defined on the question', async () => {
		const req = {
			body: {
				favouriteFruit: 'apples'
			}
		};
		const question = {
			fieldName: 'favouriteFruit',
			options: [
				{ text: 'Apples', value: 'apples' },
				{ text: 'Pears', value: 'pears' },
				{ text: 'Oranges', values: 'oranges' }
			]
		};
		const validationResult = await new ValidOptionValidator().validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});

	it('should not return an error message if the field value is a list and all elements are in the list of options defined on the question', async () => {
		const req = {
			body: {
				favouriteFruit: ['apples', 'pears']
			}
		};
		const question = {
			fieldName: 'favouriteFruit',
			options: [
				{ text: 'Apples', value: 'apples' },
				{ text: 'Pears', value: 'pears' },
				{ text: 'Oranges', values: 'oranges' }
			]
		};
		const validationResult = await new ValidOptionValidator().validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});

	it('should not return an error message if the field value is not provided', async () => {
		const question = {
			fieldName: 'favouriteFruit',
			options: [
				{ text: 'Apples', value: 'apples' },
				{ text: 'Pears', value: 'pears' },
				{ text: 'Oranges', values: 'oranges' }
			]
		};

		let req = {
			body: {
				favouriteFruit: ''
			}
		};
		let validationResult = await new ValidOptionValidator().validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);

		req = {
			body: {
				favouriteFruit: null
			}
		};
		validationResult = await new ValidOptionValidator().validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);

		req = {
			body: {
				favouriteFruit: undefined
			}
		};
		validationResult = await new ValidOptionValidator().validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);

		req = {
			body: {}
		};
		validationResult = await new ValidOptionValidator().validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
});

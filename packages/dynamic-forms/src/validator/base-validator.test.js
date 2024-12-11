import { describe, it } from 'node:test';
import assert from 'node:assert';
import BaseValidator from './base-validator.js';

describe('src/dynamic-forms/validator/base-validator.js', () => {
	it('should not be possible to instantiate the base class', () => {
		assert.throws(() => new BaseValidator(), new Error("Abstract classes can't be instantiated."));
	});
	it('should be possible to inherit from the base class', () => {
		class MyValidator extends BaseValidator {}

		const myValidator = new MyValidator();
		assert.strictEqual(myValidator.constructor, MyValidator);
		assert.strictEqual(myValidator instanceof BaseValidator, true);
	});
});

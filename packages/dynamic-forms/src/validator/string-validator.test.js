import { describe, it } from 'node:test';
import assert from 'node:assert';
import StringValidator from './string-validator.js';

describe('src/dynamic-forms/validator/string-validator.js', () => {
	it('should throw if nothing passed to constructor', () => {
		assert.throws(() => {
			new StringValidator();
		}, new Error('String validator is invoked without any validations set!'));
	});
	it('should invalidate string that does not match regex', async () => {
		const req = {
			body: {
				numberOfToes: 'three'
			}
		};
		const options = { regex: { regex: '^\\d', regexMessage: 'Number of toes should be a number' } };
		const question = {
			fieldName: 'numberOfToes'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.regex.regexMessage);
	});
	it('should invalidate string that does not match regex and use the default error message when none supplied', async () => {
		const req = {
			body: {
				numberOfToes: 'three'
			}
		};
		const options = { regex: { regex: '^\\d' } };
		const question = {
			fieldName: 'numberOfToes'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, 'Please enter only the allowed characters');
	});
	it('should validate number that does match regex', async () => {
		const req = {
			body: {
				numberOfToes: 3
			}
		};
		const options = { regex: { regex: '^\\d', regexMessage: 'Number of toes should be a number' } };
		const question = {
			fieldName: 'numberOfToes'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
	it('should invalidate a string that is too short', async () => {
		const req = {
			body: {
				shortStatement: 'I am too short'
			}
		};
		const options = {
			minLength: {
				minLength: 15,
				minLengthMessage: 'Short statement should be a minimum of 15 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.minLength.minLengthMessage);
	});
	it('should invalidate a string that is too short and use the default error message when none supplied', async () => {
		const req = {
			body: {
				shortStatement: 'I am too short'
			}
		};
		const options = {
			minLength: {
				minLength: 15
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, 'Input too short - Please enter at least 15 characters');
	});
	it('should validate a string that is long enough', async () => {
		const req = {
			body: {
				shortStatement: 'I am long enough'
			}
		};
		const options = {
			minLength: {
				minLength: 15,
				minLengthMessage: 'Short statement should be a minimum of 15 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
	it('should invalidate a string that is too long', async () => {
		const req = {
			body: {
				shortStatement: 'I am too long'
			}
		};
		const options = {
			maxLength: {
				maxLength: 10,
				maxLengthMessage: 'Short statement should be a maxmimum of 10 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.maxLength.maxLengthMessage);
	});
	it('should invalidate a string that is too long  and use the default error message when none supplied', async () => {
		const req = {
			body: {
				shortStatement: 'I am too long'
			}
		};
		const options = {
			maxLength: {
				maxLength: 10
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, 'Input too long - Please enter no more than 10 characters');
	});

	it('should invalidate a string that is too long given a specific field name', async () => {
		const req = {
			body: {
				'shortStatement_with-condition': 'I am too long'
			}
		};
		const options = {
			maxLength: {
				maxLength: 10,
				maxLengthMessage: 'Short statement should be a maxmimum of 10 characters in length'
			},
			fieldName: 'shortStatement_with-condition'
		};
		const question = {
			fieldName: 'shortStatement',
			options: [
				{
					text: 'Yes',
					value: 'yes',
					conditional: {
						question: 'Test question',
						fieldName: 'with-condition',
						type: 'textarea'
					}
				},
				{
					text: 'No',
					value: 'no'
				}
			]
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.maxLength.maxLengthMessage);
	});

	it('should validate a string that is not too long', async () => {
		const req = {
			body: {
				shortStatement: 'I am not too long'
			}
		};
		const options = {
			maxLength: {
				maxLength: 17,
				maxLengthMessage: 'Short statement should be a maxmimum of 10 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
	it('should validate a string that satisfies multiple validator links', async () => {
		const req = {
			body: {
				shortStatement: 'aaa'
			}
		};
		const options = {
			regex: {
				regex: '^[a].*$',
				regexMessage: 'Short message should be comprised of the letter a only'
			},
			minLength: {
				minLength: 3,
				minLengthMessage: 'Short statement should be a minimum of 3 characters in length'
			},
			maxLength: {
				maxLength: 4,
				maxLengthMessage: 'Short statement should be a maxmimum of 4 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
	it('should invalidate a string that does not satisfy the first one of multiple validator links, and not run the other validation links', async () => {
		const req = {
			body: {
				shortStatement: 'bbb'
			}
		};
		const options = {
			regex: {
				regex: '^[a].*$',
				regexMessage: 'Short message should be comprised of the letter a only'
			},
			minLength: {
				minLength: 3,
				minLengthMessage: 'Short statement should be a minimum of 3 characters in length'
			},
			maxLength: {
				maxLength: 4,
				maxLengthMessage: 'Short statement should be a maxmimum of 4 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.regex.regexMessage);
	});
	it('should invalidate a string that does not satisfy the second of multiple validator links, and not run the subsequent validation links', async () => {
		const req = {
			body: {
				shortStatement: 'aa'
			}
		};
		const options = {
			regex: {
				regex: '^[a].*$',
				regexMessage: 'Short message should be comprised of the letter a only'
			},
			minLength: {
				minLength: 3,
				minLengthMessage: 'Short statement should be a minimum of 3 characters in length'
			},
			maxLength: {
				maxLength: 4,
				maxLengthMessage: 'Short statement should be a maxmimum of 4 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.minLength.minLengthMessage);
	});
	it('should invalidate a string that does not satisfy the last of multiple validator links', async () => {
		const req = {
			body: {
				shortStatement: 'aaaaa'
			}
		};
		const options = {
			regex: {
				regex: '^[a].*$',
				regexMessage: 'Short message should be comprised of the letter a only'
			},
			minLength: {
				minLength: 3,
				minLengthMessage: 'Short statement should be a minimum of 3 characters in length'
			},
			maxLength: {
				maxLength: 4,
				maxLengthMessage: 'Short statement should be a maxmimum of 4 characters in length'
			}
		};
		const question = {
			fieldName: 'shortStatement'
		};
		const validationResult = await new StringValidator(options).validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 1);
		assert.strictEqual(validationResult.errors[0].msg, options.maxLength.maxLengthMessage);
	});
});

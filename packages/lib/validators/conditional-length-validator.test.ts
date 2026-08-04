import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConditionalLengthValidator } from './conditional-length-validator.ts';

async function getValidationErrors(
	validator: ConditionalLengthValidator,
	body: Record<string, unknown>,
	question: { fieldName: string; options: Array<{ value: string; conditional?: { fieldName: string } }> }
) {
	const req = { body };
	const chains = validator.validate(question);
	const results = await Promise.all(chains.map((chain) => chain.run(req)));
	return results.flatMap((result) => result.array());
}

describe('ConditionalLengthValidator', () => {
	const question = {
		fieldName: 'contactType',
		options: [
			{ value: 'email' },
			{
				value: 'other',
				conditional: { fieldName: 'otherDetails' }
			}
		]
	};

	it('passes when correct option is selected and input meets length criteria', async () => {
		const validator = new ConditionalLengthValidator({ min: 2, max: 20 });
		const reqBody = {
			contactType: 'other',
			contactType_otherDetails: 'Carrier Pigeon'
		};

		const errors = await getValidationErrors(validator, reqBody, question);
		assert.strictEqual(errors.length, 0);
	});

	it('bypasses validation when correct option is not selected', async () => {
		const validator = new ConditionalLengthValidator({ min: 5, max: 10 });
		const reqBody = {
			contactType: 'email',
			contactType_otherDetails: '12' // Fails length, but should be ignored because 'other' isn't selected
		};

		const errors = await getValidationErrors(validator, reqBody, question);
		assert.strictEqual(errors.length, 0);
	});

	it('bypasses validation when conditional field is empty (handled by optional check)', async () => {
		const validator = new ConditionalLengthValidator({ min: 5, max: 10 });
		const reqBody = {
			contactType: 'other',
			contactType_otherDetails: ''
		};

		const errors = await getValidationErrors(validator, reqBody, question);
		assert.strictEqual(errors.length, 0);
	});

	it('rejects input shorter than the minimum required length', async () => {
		const errorMessage = 'Must be at least 5 characters';
		const validator = new ConditionalLengthValidator({ min: 5, errorMessage });
		const reqBody = {
			contactType: 'other',
			contactType_otherDetails: 'Abc'
		};

		const errors = await getValidationErrors(validator, reqBody, question);
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, errorMessage);
	});

	it('rejects input exceeding maximum allowed length', async () => {
		const errorMessage = 'Details must be 10 characters or fewer';
		const validator = new ConditionalLengthValidator({ max: 10, errorMessage });
		const reqBody = {
			contactType: 'other',
			contactType_otherDetails: 'This text is way too long'
		};

		const errors = await getValidationErrors(validator, reqBody, question);
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, errorMessage);
	});
});

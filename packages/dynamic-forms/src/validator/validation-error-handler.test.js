import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildValidationErrorHandler } from './validation-error-handler.js';

describe('./src/dynamic-forms/validator/validation-error-handler.js', () => {
	it('should call next if no errors', async () => {
		const req = {
			body: {
				field1: 'bananas'
			}
		};
		const validate = mock.fn(() => {
			return {
				isEmpty: () => {
					return true;
				}
			};
		});

		const next = mock.fn();
		const summarise = mock.fn();
		const validationErrorHandler = buildValidationErrorHandler(validate, summarise);
		validationErrorHandler(req, {}, next);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(summarise.mock.callCount(), 0);
	});

	it('should call next if only empty error messages', async () => {
		const req = {
			body: {
				field1: 'bananas'
			}
		};
		const validate = mock.fn(() => {
			return {
				isEmpty: () => {
					return false;
				},
				mapped: () => {
					return { test: { msg: undefined } };
				}
			};
		});

		const next = mock.fn();
		const summarise = mock.fn();
		const validationErrorHandler = buildValidationErrorHandler(validate, summarise);
		validationErrorHandler(req, {}, next);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(summarise.mock.callCount(), 0);
	});

	it('should map errors if some are returned', async () => {
		const req = {
			body: {
				field1: 'bananas'
			}
		};
		const validate = mock.fn(() => {
			return {
				isEmpty: () => {
					return false;
				},
				mapped: () => {
					return { test: { msg: 'hello' } };
				}
			};
		});

		const next = mock.fn();
		const summarise = mock.fn();
		const validationErrorHandler = buildValidationErrorHandler(validate, summarise);
		validationErrorHandler(req, {}, next);
		assert.strictEqual(summarise.mock.callCount(), 1);
		assert.strictEqual(next.mock.callCount(), 1);
	});
});

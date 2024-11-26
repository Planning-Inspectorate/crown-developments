import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDefaultErrorHandlerMiddleware, notFoundHandler } from './errors.js';

describe('errors', () => {
	describe('buildDefaultErrorHandlerMiddleware', () => {
		test('uses error status code', (t) => {
			const logger = {
				error() {}
			};
			t.mock.method(logger, 'error');
			const handler = buildDefaultErrorHandlerMiddleware(() => logger);
			const err = {
				statusCode: 502
			};
			const res = {
				status() {},
				render() {}
			};
			t.mock.method(res, 'status');
			t.mock.method(res, 'render');

			handler(err, {}, res, () => {});
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [err.statusCode]);
		});
	});
	describe('notFound', () => {
		test('returns 404', (t) => {
			const res = {
				status() {},
				render() {}
			};
			t.mock.method(res, 'status');
			t.mock.method(res, 'render');

			notFoundHandler({}, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [404]);
			const renderArgs = res.render.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'views/layouts/error');
		});
	});
});

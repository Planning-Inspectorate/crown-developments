import { buildNotifyCallbackTokenValidator } from './notify-callback.js';
import { test, describe, beforeEach } from 'node:test';
import assert from 'assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('buildNotifyCallbackTokenValidator', () => {
	let logger;
	let service;
	let req;
	let res;
	let nextCalled;
	let next;

	beforeEach(() => {
		logger = mockLogger();
		service = { webHookToken: 'secret', logger };
		req = { headers: {} };
		res = {
			statusCode: null,
			sent: null,
			status(code) {
				this.statusCode = code;
				return this;
			},
			send(msg) {
				this.sent = msg;
				return this;
			}
		};
		nextCalled = false;
		next = () => {
			nextCalled = true;
		};
	});

	test('should return 401 if Authorization header is missing', async () => {
		req.headers = {};
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, 401);
		assert.strictEqual(res.sent, 'Unauthorized access');
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(logger.warn.mock.calls.length, 1);
	});

	test('should return 401 if Authorization header is malformed', async () => {
		req.headers = { authorization: 'Bearer' };
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, 401);
		assert.strictEqual(res.sent, 'Unauthorized access');
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(logger.warn.mock.calls.length, 1);
	});

	test('should return 401 if token is invalid', async () => {
		req.headers = { authorization: 'Bearer wrongtoken' };
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, 401);
		assert.strictEqual(res.sent, 'Unauthorized access');
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(logger.warn.mock.calls.length, 1);
	});

	test('should call next if token is valid', async () => {
		req.headers = { authorization: 'Bearer secret' };
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, null);
		assert.strictEqual(res.sent, null);
		assert.strictEqual(nextCalled, true);
		assert.strictEqual(logger.warn.mock.calls.length, 0);
	});

	test('should return 500 if service.webHookToken is undefined', async () => {
		service.webHookToken = undefined;
		req.headers = { authorization: 'Bearer secret' };
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, 500);
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(logger.warn.mock.calls.length, 1);
	});

	test('should return 500 if service.webHookToken is null', async () => {
		service.webHookToken = null;
		req.headers = { authorization: 'Bearer secret' };
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, 500);
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(logger.warn.mock.calls.length, 1);
	});
	test('should return 500 if service.webHookToken is an empty string', async () => {
		service.webHookToken = '';
		req.headers = { authorization: 'Bearer secret' };
		await buildNotifyCallbackTokenValidator(service)(req, res, next);
		assert.strictEqual(res.statusCode, 500);
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(logger.warn.mock.calls.length, 1);
	});
});

import { cleanEmptyQueryParams, trimEmptyQuery } from './query-middleware.js';
import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

describe('query-middleware', () => {
	let req;
	let res;
	let next;
	let nextCalled;
	let redirectUrl;

	beforeEach(() => {
		req = {
			originalUrl: '',
			headers: { host: 'localhost' },
			query: {},
			path: ''
		};
		redirectUrl = undefined;
		nextCalled = false;
		res = {
			redirect: (url) => {
				redirectUrl = url;
			}
		};
		next = () => {
			nextCalled = true;
		};
	});

	describe('cleanEmptyQueryParams', () => {
		it('should remove empty query params and redirect', () => {
			req.originalUrl = '/test?a=1&b=&c=3';
			cleanEmptyQueryParams(req, res, next);
			assert.strictEqual(redirectUrl, '/test?a=1&c=3');
			assert.strictEqual(nextCalled, false);
		});

		it('should call next if no empty query params', () => {
			req.originalUrl = '/test?a=1&b=2';
			cleanEmptyQueryParams(req, res, next);
			assert.strictEqual(redirectUrl, undefined);
			assert.strictEqual(nextCalled, true);
		});

		it('should call next if no query params', () => {
			req.originalUrl = '/test';
			cleanEmptyQueryParams(req, res, next);
			assert.strictEqual(redirectUrl, undefined);
			assert.strictEqual(nextCalled, true);
		});

		it('should handle multiple empty params', () => {
			req.originalUrl = '/test?a=&b=&c=3';
			cleanEmptyQueryParams(req, res, next);
			assert.strictEqual(redirectUrl, '/test?c=3');
			assert.strictEqual(nextCalled, false);
		});
	});

	describe('trimEmptyQuery', () => {
		it('should redirect if query is empty and url ends with ?', () => {
			req.originalUrl = '/test?';
			req.query = {};
			req.path = '/test';
			trimEmptyQuery(req, res, () => {
				nextCalled = true;
			});
			assert.strictEqual(redirectUrl, '/test');
			assert.strictEqual(nextCalled, false);
		});

		it('should redirect to / if path is invalid', () => {
			req.originalUrl = '/test?';
			req.query = {};
			req.path = 'invalid path!';
			trimEmptyQuery(req, res, () => {
				nextCalled = true;
			});
			assert.strictEqual(redirectUrl, '/');
			assert.strictEqual(nextCalled, false);
		});

		it('should call next if query is not empty', () => {
			req.originalUrl = '/test?a=1';
			req.query = { a: '1' };
			req.path = '/test';
			trimEmptyQuery(req, res, () => {
				nextCalled = true;
			});
			assert.strictEqual(redirectUrl, undefined);
			assert.strictEqual(nextCalled, true);
		});

		it('should call next if url does not end with ?', () => {
			req.originalUrl = '/test';
			req.query = {};
			req.path = '/test';
			trimEmptyQuery(req, res, () => {
				nextCalled = true;
			});
			assert.strictEqual(redirectUrl, undefined);
			assert.strictEqual(nextCalled, true);
		});
	});
});

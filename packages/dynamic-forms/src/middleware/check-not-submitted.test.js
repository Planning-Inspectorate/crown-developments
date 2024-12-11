import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import checkNotSubmitted from './check-not-submitted.js';

const testUrl = '/test';

describe('dynamic-forms/middleware/check-not-submitted', () => {
	const mockReq = () => ({
		cookies: {},
		log: {},
		params: {}
	});

	[
		{
			description: 'should do nothing if submitted is undefined',
			given: () => {
				return {
					req: mockReq(),
					res: {}
				};
			},
			expected: (req, res, next) => {
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should do nothing if submitted is false',
			given: () => {
				return {
					req: mockReq(),
					res: {
						locals: {
							journeyResponse: {
								answers: { submitted: false }
							}
						}
					}
				};
			},
			expected: (req, res, next) => {
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should do nothing if submitted is no',
			given: () => {
				return {
					req: mockReq(),
					res: {
						locals: {
							journeyResponse: {
								answers: {
									submitted: 'no'
								}
							}
						}
					}
				};
			},
			expected: (req, res, next) => {
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should redirect if submitted is true',
			given: () => {
				return {
					req: mockReq(),
					res: {
						locals: {
							journeyResponse: {
								answers: {
									submitted: true
								}
							}
						},
						redirect: mock.fn()
					}
				};
			},
			expected: (req, res) => {
				assert.strictEqual(res.redirect.mock.callCount(), 1);
			}
		},
		{
			description: 'should redirect if submitted is yes',
			given: () => {
				return {
					req: mockReq(),
					res: {
						locals: {
							journeyResponse: {
								answers: {
									submitted: 'yes'
								}
							}
						},
						redirect: mock.fn()
					}
				};
			},
			expected: (req, res) => {
				assert.strictEqual(res.redirect.mock.callCount(), 1);
			}
		}
	].forEach(({ description, given, expected }) => {
		it(description, () => {
			const next = mock.fn();
			const req = given().req;
			const res = given().res;

			checkNotSubmitted(testUrl)(req, res, next);

			expected(req, res, next);
		});
	});
});

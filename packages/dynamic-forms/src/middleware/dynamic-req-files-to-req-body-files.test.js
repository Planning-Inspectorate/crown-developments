import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import dynamicReqFilesToReqBodyFilesMiddleware from './dynamic-req-files-to-req-body-files.js';

describe('dynamic-forms/middleware/dynamic-req-files-to-req-body-files', () => {
	let counter = 0;
	let mockReq;
	let mockRes;
	let filesPropertyPath = `example-files-property-path-${counter}`;

	const mockGetQuestionBySectionAndName = mock.fn(() => {
		return { fieldName: filesPropertyPath };
	});

	beforeEach(() => {
		mockReq = () => ({
			cookies: {},
			log: {},
			params: {}
		});

		mockRes = () => ({
			clearCookie: mock.fn(),
			cookie: mock.fn(),
			locals: {
				journeyResponse: mock.fn(),
				journey: { getQuestionBySectionAndName: mockGetQuestionBySectionAndName }
			},
			redirect: mock.fn(),
			render: mock.fn(),
			sendStatus: mock.fn(),
			status: mock.fn()
		});

		counter++;
		filesPropertyPath = `example-files-property-path-${counter}`;
	});

	[
		{
			description: 'should return early if `req.body` is not set',
			given: () => mockReq(),
			expected: (req, res, next) => {
				assert.strictEqual(req.body, undefined);
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should return early if `req.files` is not set',
			given: () => ({
				...mockReq(),
				body: {}
			}),
			expected: (req, res, next) => {
				assert.strictEqual(req.body.files, undefined);
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should return early if `req.params` is not set',
			given: () => ({
				cookies: {},
				log: {},
				body: {},
				files: {}
			}),
			expected: (req, res, next) => {
				assert.strictEqual(req.body.files, undefined);
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description:
				'should set `req.body.files = []` if unable to find the given file property path `req.files` - unset',
			given: () => ({
				...mockReq(),
				body: {},
				files: {},
				params: {
					section: 'mock-section',
					question: 'mock-question'
				}
			}),
			expected: (req, res, next) => {
				assert.deepStrictEqual(req.body.files, []);
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description:
				'should set `req.body.files = []` if unable to find the given file property path `req.files` - wrong path',
			given: () => ({
				...mockReq(),
				body: {},
				files: {
					'some-different-path': {
						x: 'y'
					}
				},
				params: {
					section: 'mock-section',
					question: 'mock-question'
				}
			}),
			expected: (req, res, next) => {
				assert.deepStrictEqual(req.body.files, []);
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should set `req.body.files = [req.files]` when given a single file',
			given: () => ({
				...mockReq(),
				body: {},
				params: {
					section: 'mock-section',
					question: 'mock-question'
				},
				files: {
					[filesPropertyPath]: {
						a: 'b'
					}
				}
			}),
			expected: (req, res, next) => {
				assert.deepStrictEqual(req.body.files, { [filesPropertyPath]: [{ a: 'b' }] });
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should set `req.body.files = [...req.files]` when given multiple files',
			given: () => ({
				...mockReq(),
				body: {},
				params: {
					section: 'mock-section',
					question: 'mock-question'
				},
				files: {
					[filesPropertyPath]: [
						{
							a: 'b'
						},
						{
							c: 'd'
						}
					]
				}
			}),
			expected: (req, res, next) => {
				assert.deepStrictEqual(req.body.files, {
					[filesPropertyPath]: [
						{
							a: 'b'
						},
						{
							c: 'd'
						}
					]
				});
				assert.strictEqual(next.mock.callCount(), 1);
			}
		},
		{
			description: 'should retain existing req.body.files when working with a different key',
			given: () => ({
				...mockReq(),
				body: {
					files: {
						'an-existing-key-value-pair': [
							{
								rgb: 'xyz'
							}
						]
					}
				},
				files: {
					[filesPropertyPath]: [
						{
							a: 'b'
						},
						{
							c: 'd'
						}
					]
				},
				params: {
					section: 'mock-section',
					question: 'mock-question'
				}
			}),
			expected: (req, res, next) => {
				assert.deepStrictEqual(req.body.files, {
					'an-existing-key-value-pair': [
						{
							rgb: 'xyz'
						}
					],
					[filesPropertyPath]: [
						{
							a: 'b'
						},
						{
							c: 'd'
						}
					]
				});
				assert.strictEqual(next.mock.callCount(), 1);
			}
		}
	].forEach(({ description, given, expected }) => {
		it(description, () => {
			const next = mock.fn();
			const req = given();

			dynamicReqFilesToReqBodyFilesMiddleware()(req, mockRes(), next);

			expected(req, mockRes(), next);
		});
	});
});

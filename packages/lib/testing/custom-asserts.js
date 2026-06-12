import assert from 'node:assert';
import { mock } from 'node:test';

/**
 *
 * @param {Function | Handler} functionToTest
 * @param {Object} mockReq
 * @param {Boolean} isMiddleWare
 * @returns {Promise<void>}
 */
export async function assertRenders404Page(functionToTest, mockReq, isMiddleWare) {
	const mockRes = {
		locals: {},
		status: mock.fn(),
		render: mock.fn()
	};

	if (isMiddleWare) {
		const next = mock.fn();
		await assert.doesNotReject(() => functionToTest(mockReq, mockRes, next));
		assert.strictEqual(next.mock.callCount(), 0);
	} else {
		await assert.doesNotReject(() => functionToTest(mockReq, mockRes));
	}
	assert.strictEqual(mockRes.status.mock.callCount(), 1);
	assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
	assert.strictEqual(mockRes.render.mock.callCount(), 1);
}

/**
 * Assert that the actual object includes the expected subset of key-value pairs.
 * @param {Record<string, unknown>} actual
 * @param {Record<string, unknown>} expectedSubset
 */
export function assertIncludesObject(actual, expectedSubset) {
	for (const [key, value] of Object.entries(expectedSubset)) {
		assert.deepStrictEqual(actual[key], value);
	}
}

import { describe, it } from 'node:test';
import { getAnswers } from './answers.js';
import assert from 'node:assert';

describe('getAnswers', () => {
	it('returns a view model with correct properties when address is provided', () => {
		const mockRes = {
			locals: {
				journeyResponse: {
					answers: {
						updateDetails: 'an update',
						publishNow: 'yes'
					}
				}
			}
		};

		const result = getAnswers(mockRes);

		assert.deepStrictEqual(result, {
			updateDetails: 'an update',
			publishNow: 'yes'
		});
	});
	it('throws an error if the answers value is not an object', () => {
		const mockRes = {
			locals: {
				journeyResponse: {
					answers: 'a string'
				}
			}
		};

		assert.throws(() => getAnswers(mockRes));
	});
	it('throws error if locals and journeyResponse not represent in res object', () => {
		assert.throws(() => getAnswers({}));
	});
});

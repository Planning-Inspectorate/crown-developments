import { describe, it } from 'node:test';
import assert from 'node:assert';
import { APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { getSummaryWarningMessage } from './util.js';

describe('create-a-case util', () => {
	describe('getSummaryWarningMessage', () => {
		it('should return second case warning text if type of application is planning and lbc', () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							typeOfApplication: APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
						}
					}
				}
			};

			assert.strictEqual(
				getSummaryWarningMessage(mockRes),
				'Clicking accept & submit will create a second case as part of the connected application'
			);
		});
		it('should return notification warning text if type of application is not planning and lbc', () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							typeOfApplication: APPLICATION_TYPE_ID.OUTLINE_PLANNING_SOME_RESERVED
						}
					}
				}
			};

			assert.strictEqual(
				getSummaryWarningMessage(mockRes),
				'Clicking Accept & Submit will send a notification to the applicant / agent'
			);
		});
		it('should throw error if answers object is not present', () => {
			assert.throws(() => getSummaryWarningMessage({}));
		});
	});
});

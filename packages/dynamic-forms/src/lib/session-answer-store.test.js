import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildGetJourneyResponseFromSession, clearDataFromSession, saveDataToSession } from './session-answer-store.js';
import { mockReq, mockRes } from './test-utils.js';
import { BOOLEAN_OPTIONS } from '../components/boolean/question.js';

describe('session-answer-store', () => {
	describe('saveDataToSession', () => {
		it('should throw if no session', async () => {
			const req = mockReq();
			const journeyId = 'j-1';
			const data = { answers: { q1: 'a1' } };
			await assert.rejects(async () => await saveDataToSession({ req, journeyId, data }));
		});
		it('should handle empty session', async () => {
			const req = mockReq();
			req.session = {};
			const journeyId = 'j-1';
			const data = { answers: { q1: 'a1' } };
			await assert.doesNotReject(async () => await saveDataToSession({ req, journeyId, data }));
		});
		it('should save data by journeyId session', async () => {
			const req = mockReq();
			req.session = {};
			const journeyId = 'j-1';
			const data = { answers: { q1: 'a1' } };
			await saveDataToSession({ req, journeyId, data });
			assert.deepStrictEqual(req.session, {
				forms: {
					'j-1': {
						q1: 'a1'
					}
				}
			});
		});
		it('should overwrite existing data', async () => {
			const req = mockReq();
			req.session = {
				forms: {
					'j-1': {
						q1: 'a1'
					}
				}
			};
			const journeyId = 'j-1';
			const data = { answers: { q1: 'a2', q2: true } };
			await saveDataToSession({ req, journeyId, data });
			assert.deepStrictEqual(req.session, {
				forms: {
					'j-1': {
						q1: 'a2',
						q2: true
					}
				}
			});
		});
	});

	describe('clearDataFromSession', () => {
		it('should no-op if no session', () => {
			const req = mockReq();
			const journeyId = 'j-1';
			assert.doesNotThrow(() => clearDataFromSession({ req, journeyId }));
		});
		it('should no-op if empty session', async () => {
			const req = mockReq();
			req.session = {};
			const journeyId = 'j-1';
			assert.doesNotThrow(() => clearDataFromSession({ req, journeyId }));
		});
		it('should clear session data for journey', async () => {
			const journeyId = 'j-1';
			const req = mockReq();
			req.session = {
				forms: { [journeyId]: { q1: 'a1', q2: false } }
			};
			clearDataFromSession({ req, journeyId });
			assert.strictEqual(journeyId in req.session.forms, false);
		});
		it('should replace session data for journey', async () => {
			const journeyId = 'j-1';
			const req = mockReq();
			req.session = {
				forms: { [journeyId]: { q1: 'a1', q2: false } }
			};
			const newData = { myField: 'value1' };
			clearDataFromSession({ req, journeyId, replaceWith: newData });
			assert.strictEqual(req.session.forms[journeyId], newData);
		});
	});

	describe('buildGetJourneyResponseFromSession', () => {
		const journeyId = 'j-1';
		it('should throw if no session', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn();
			const handler = buildGetJourneyResponseFromSession(journeyId);
			assert.throws(() => handler(req, res, next));
		});
		it('should handle empty session', async () => {
			const req = mockReq();
			req.session = {};
			const res = mockRes();
			const next = mock.fn();
			const handler = buildGetJourneyResponseFromSession(journeyId);
			assert.doesNotThrow(() => handler(req, res, next));
			assert.strictEqual(next.mock.callCount(), 1);
		});
		it('should fetch answers by journeyId from session', async () => {
			const answers = { q1: 'a1' };
			const req = mockReq();
			req.session = {
				forms: {
					[journeyId]: answers
				}
			};
			const res = mockRes();
			const next = mock.fn();
			const handler = buildGetJourneyResponseFromSession(journeyId);
			handler(req, res, next);
			assert.ok(res.locals.journeyResponse);
			assert.deepStrictEqual(res.locals.journeyResponse.answers, answers);
		});
		it(`shouldn't fetch answers for other journeys from session`, async () => {
			const answers = { q1: 'a1' };
			const otherAnswers = { q2: 'a3' };
			const req = mockReq();
			req.session = {
				forms: {
					[journeyId]: answers,
					[journeyId + '_other']: otherAnswers
				}
			};
			const res = mockRes();
			const next = mock.fn();
			const handler = buildGetJourneyResponseFromSession(journeyId);
			handler(req, res, next);
			assert.ok(res.locals.journeyResponse);
			assert.deepStrictEqual(res.locals.journeyResponse.answers, answers);
			assert.notDeepStrictEqual(res.locals.journeyResponse.answers, otherAnswers);
		});
		it('should change boolean answers to yes/no', async () => {
			const answers = { q1: true, q2: 'a2', q3: false };
			const req = mockReq();
			req.session = {
				forms: {
					[journeyId]: answers
				}
			};
			const res = mockRes();
			const next = mock.fn();
			const handler = buildGetJourneyResponseFromSession(journeyId);
			handler(req, res, next);
			assert.ok(res.locals.journeyResponse);
			assert.deepStrictEqual(res.locals.journeyResponse.answers, {
				q1: BOOLEAN_OPTIONS.YES,
				q2: 'a2',
				q3: BOOLEAN_OPTIONS.NO
			});
		});
	});
});

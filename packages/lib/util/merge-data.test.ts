import { describe, it } from 'node:test';
import assert from 'node:assert';
import { combineSessionAndDbData, mergeArraysById } from './merge-data.ts';

describe('Merging Data Util', () => {
	describe('combineSessionAndDbData', () => {
		it('returns DB answers when journeyResponse answers are missing', () => {
			const dbAnswers = { name: 'DB name', procedureId: 'p1' };
			const sessionAnswers = undefined;
			assert.deepStrictEqual(combineSessionAndDbData(dbAnswers, sessionAnswers), dbAnswers);
		});

		it('returns DB answers when journeyResponse answers are empty', () => {
			const res = { locals: { journeyResponse: { answers: {} } } };
			const dbAnswers = { name: 'DB name' };
			const sessionAnswers = res.locals.journeyResponse?.answers;
			assert.deepStrictEqual(combineSessionAndDbData(dbAnswers, sessionAnswers), dbAnswers);
		});

		it('prefers session scalar values over DB values', () => {
			const res = {
				locals: {
					journeyResponse: {
						answers: { name: 'Session name', count: 2 }
					}
				}
			};
			const dbAnswers = { name: 'DB name', count: 1 };
			const sessionAnswers = res.locals.journeyResponse?.answers;
			assert.deepStrictEqual(combineSessionAndDbData(dbAnswers, sessionAnswers), {
				name: 'Session name',
				count: 2
			});
		});

		it('does not overwrite DB values when session value is undefined or null', () => {
			const res = {
				locals: {
					journeyResponse: {
						answers: { name: undefined, title: null, keep: 'session' }
					}
				}
			};
			const dbAnswers = { name: 'DB name', title: 'DB title', keep: 'db' };
			const sessionAnswers = res.locals.journeyResponse?.answers;
			assert.deepStrictEqual(combineSessionAndDbData(dbAnswers, sessionAnswers as any), {
				name: 'DB name',
				title: 'DB title',
				keep: 'session'
			});
		});

		it('merges array answers by id, overwriting matching items and appending new items', () => {
			const res = {
				locals: {
					journeyResponse: {
						answers: {
							items: [
								{ id: '1', a: 'session-a', extra: 'x' },
								{ id: '3', a: 'new' }
							]
						}
					}
				}
			};
			const dbAnswers = {
				items: [
					{ id: '1', a: 'db-a', b: 'db-b' },
					{ id: '2', a: 'db2' }
				]
			};

			const sessionAnswers = res.locals.journeyResponse?.answers;
			assert.deepStrictEqual(combineSessionAndDbData(dbAnswers, sessionAnswers), {
				items: [
					{ id: '1', a: 'session-a', b: 'db-b', extra: 'x' },
					{ id: '2', a: 'db2' },
					{ id: '3', a: 'new' }
				]
			});
		});

		it('keeps DB array when session array is null', () => {
			const res = { locals: { journeyResponse: { answers: { items: null } } } };
			const dbAnswers = { items: [{ id: '1', a: 'db' }] };
			const sessionAnswers = res.locals.journeyResponse?.answers;
			assert.deepStrictEqual(combineSessionAndDbData(dbAnswers, sessionAnswers as any), dbAnswers);
		});
	});

	describe('mergeArraysById', () => {
		it('overwrites matching DB items with session item keys and preserves DB keys not present in session', () => {
			const dbArray = [{ id: '1', a: 'db-a', b: 'db-b' }];
			const sessionArray = [{ id: '1', a: 'session-a' }];

			assert.deepStrictEqual(mergeArraysById(dbArray, sessionArray), [{ id: '1', a: 'session-a', b: 'db-b' }]);
		});

		it('appends session items when no matching id exists', () => {
			const dbArray = [{ id: '1', a: 'db-a' }];
			const sessionArray = [{ id: '2', a: 'session-a' }];

			assert.deepStrictEqual(mergeArraysById(dbArray, sessionArray), [
				{ id: '1', a: 'db-a' },
				{ id: '2', a: 'session-a' }
			]);
		});
		it('treats session items missing an id as new items and appends them', () => {
			const dbArray = [{ id: '1', a: 'db-a' }];
			const sessionArray = [{ a: 'no-id' }, { id: null, a: 'null-id' }];

			assert.deepStrictEqual(mergeArraysById(dbArray, sessionArray as any), [
				{ id: '1', a: 'db-a' },
				{ a: 'no-id' },
				{ id: null, a: 'null-id' }
			]);
		});
	});
});

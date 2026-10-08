import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDerivedAnswers } from './derived-fields.ts';

describe('getDerivedAnswers', () => {
	const FIELDS = ['targetPublishDate', 'targetDecisionDate'];
	const publishDate = new Date('2026-01-08T00:00:00.000Z');
	const decisionDate = new Date('2026-03-05T00:00:00.000Z');

	it('returns each derived field in the update', () => {
		const update = {
			targetPublishDate: publishDate,
			targetDecisionDate: decisionDate,
			applicationValidDate: new Date()
		};

		assert.deepStrictEqual(getDerivedAnswers(update, FIELDS), {
			targetPublishDate: publishDate,
			targetDecisionDate: decisionDate
		});
	});

	it('keeps a null, so a cleared field is audited as cleared', () => {
		assert.deepStrictEqual(getDerivedAnswers({ targetDecisionDate: null }, FIELDS), { targetDecisionDate: null });
	});

	it('unwraps a { set } value', () => {
		assert.deepStrictEqual(getDerivedAnswers({ targetPublishDate: { set: publishDate } }, FIELDS), {
			targetPublishDate: publishDate
		});
	});

	it('leaves out derived fields the update does not touch', () => {
		assert.deepStrictEqual(getDerivedAnswers({ targetPublishDate: publishDate }, FIELDS), {
			targetPublishDate: publishDate
		});
	});

	it('returns nothing when there is no update', () => {
		assert.deepStrictEqual(getDerivedAnswers(undefined, FIELDS), {});
		assert.deepStrictEqual(getDerivedAnswers(null, FIELDS), {});
	});

	it('returns nothing when the data model has no derived fields', () => {
		assert.deepStrictEqual(getDerivedAnswers({ targetPublishDate: publishDate }, []), {});
	});
});

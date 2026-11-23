import { describe, it } from 'node:test';
import assert from 'node:assert';
import { siteVisitAnswersToClear } from './site-visit.ts';

describe('siteVisitAnswersToClear', () => {
	const saved = {
		siteVisitTypeId: 'access-required',
		siteVisitDate: new Date('2027-03-27T00:00:00Z'),
		siteVisitStartTime: new Date('2027-03-27T10:00:00Z'),
		siteVisitEndTime: new Date('2027-03-27T12:30:00Z')
	};

	it('should clear the saved date and times when the type changes', () => {
		assert.deepStrictEqual(siteVisitAnswersToClear({ siteVisitTypeId: 'unaccompanied' }, saved), {
			siteVisitDate: null,
			siteVisitStartTime: null,
			siteVisitEndTime: null
		});
	});

	it('should only clear the fields that have a value', () => {
		const savedUsv = { siteVisitTypeId: 'unaccompanied', siteVisitDate: saved.siteVisitDate };
		assert.deepStrictEqual(siteVisitAnswersToClear({ siteVisitTypeId: 'access-required' }, savedUsv), {
			siteVisitDate: null
		});
	});

	it('should clear the saved date and times when the type is removed', () => {
		assert.deepStrictEqual(Object.keys(siteVisitAnswersToClear({ siteVisitTypeId: null }, saved)).length, 3);
	});

	it('should clear nothing when the same type is saved again', () => {
		assert.deepStrictEqual(siteVisitAnswersToClear({ siteVisitTypeId: 'access-required' }, saved), {});
	});

	it('should clear nothing when the type is not being saved', () => {
		assert.deepStrictEqual(siteVisitAnswersToClear({}, saved), {});
	});

	it('should clear nothing when a type is chosen for the first time', () => {
		assert.deepStrictEqual(siteVisitAnswersToClear({ siteVisitTypeId: 'unaccompanied' }, {}), {});
	});
});

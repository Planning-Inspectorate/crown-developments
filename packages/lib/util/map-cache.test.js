import { describe, it } from 'node:test';
import { MapCache } from './map-cache.js';
import assert from 'node:assert';

describe('MapCache', () => {
	it('should add entries with the current date', () => {
		let date = new Date('2025-01-30T00:00:00.000Z');
		const getNow = () => date;
		const cache = new MapCache(5, getNow);

		cache.set('id-1', true);

		assert.strictEqual(cache.cache.get('id-1').updated, date);
	});
	it(`should return values that aren't expired`, () => {
		let date = new Date('2025-01-30T00:00:00.000Z');
		const getNow = () => date;
		const cache = new MapCache(5, getNow);
		cache.set('id-1', true);
		cache.set('id-2', 'value 2');

		assert.strictEqual(cache.get('id-1'), true);
		assert.strictEqual(cache.get('id-2'), 'value 2');
	});
	it(`should return undefined if no entry`, () => {
		let date = new Date('2025-01-30T00:00:00.000Z');
		const getNow = () => date;
		const cache = new MapCache(5, getNow);

		assert.strictEqual(cache.get('id-1'), undefined);
	});
	it(`should not return expired values`, () => {
		let date = new Date('2025-01-30T00:00:00.000Z');
		const getNow = () => date;
		const cache = new MapCache(5, getNow);
		cache.set('id-1', true);
		cache.set('id-2', 'value 2');

		assert.strictEqual(cache.get('id-1'), true);
		assert.strictEqual(cache.get('id-2'), 'value 2');

		// 5 minutes on, not yet expired
		date = new Date('2025-01-30T00:05:00.000Z');
		assert.strictEqual(cache.get('id-1'), true);
		assert.strictEqual(cache.get('id-2'), 'value 2');

		// 10 minutes on, now expired
		date = new Date('2025-01-30T00:10:00.000Z');
		assert.strictEqual(cache.get('id-1'), undefined);
		assert.strictEqual(cache.get('id-2'), undefined);
	});
});

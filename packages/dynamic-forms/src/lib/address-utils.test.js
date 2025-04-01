import { describe, it } from 'node:test';
import assert from 'node:assert';
import { addressToViewModel } from './address-utils.js';

describe('address-utils', () => {
	it('formats address when all fields populated', () => {
		const result = addressToViewModel({
			line1: '1 The Street',
			line2: 'Somewhere',
			townCity: 'A Town',
			county: 'The County',
			postcode: 'AB1 2CD'
		});

		assert.strictEqual(result, '1 The Street, Somewhere, A Town, The County, AB1 2CD');
	});
	it('formats address when some fields missing', () => {
		const result = addressToViewModel({
			line1: '1 The Street',
			townCity: 'A Town',
			postcode: 'AB1 2CD'
		});

		assert.strictEqual(result, '1 The Street, A Town, AB1 2CD');
	});
	it('empty string when all fields missing', () => {
		const result = addressToViewModel({});
		assert.strictEqual(result, '');
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Address } from './address.js';

describe('Address', () => {
	it('creates an instance of an Address', () => {
		const params = {
			addressLine1: '1 The Street',
			addressLine2: 'Somewhere',
			townCity: 'A Town',
			county: 'The County',
			postcode: 'AB1 2CD'
		};

		const address = new Address(params);

		assert.strictEqual(address instanceof Address, true);
		assert.strictEqual(address.addressLine1, params.addressLine1);
		assert.strictEqual(address.addressLine2, params.addressLine2);
		assert.strictEqual(address.townCity, params.townCity);
		assert.strictEqual(address.county, params.county);
		assert.strictEqual(address.postcode, params.postcode);
	});

	it('allows addressLine2 to be optional', () => {
		const params = {
			postcode: 'EF4 5GH',
			addressLine1: '42 The Avenue',
			townCity: 'A City'
		};

		const address = new Address(params);

		assert.strictEqual(address instanceof Address, true);
		assert.strictEqual(address.addressLine1, params.addressLine1);
		assert.strictEqual(address.addressLine2, undefined);
		assert.strictEqual(address.townCity, params.townCity);
		assert.strictEqual(address.postcode, params.postcode);
	});

	it('allows county to be optional', () => {
		const params = {
			postcode: 'EF4 5GH',
			addressLine1: '42 The Avenue',
			addressLine2: 'Somewhere',
			townCity: 'A City'
		};

		const address = new Address(params);

		assert.strictEqual(address instanceof Address, true);
		assert.strictEqual(address.addressLine1, params.addressLine1);
		assert.strictEqual(address.addressLine2, params.addressLine2);
		assert.strictEqual(address.townCity, params.townCity);
		assert.strictEqual(address.postcode, params.postcode);
		assert.strictEqual(address.county, undefined);
	});

	it('allows postcode to be optional', () => {
		const params = {
			addressLine1: '42 The Avenue',
			addressLine2: 'Some more text',
			townCity: 'A City'
		};

		const address = new Address(params);

		assert.strictEqual(address instanceof Address, true);
		assert.strictEqual(address.addressLine1, params.addressLine1);
		assert.strictEqual(address.addressLine2, params.addressLine2);
		assert.strictEqual(address.townCity, params.townCity);
		assert.strictEqual(address.postcode, undefined);
	});
});

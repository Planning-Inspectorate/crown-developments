import { describe, it } from 'node:test';
import assert from 'node:assert';
import { addressToViewModel, isAddress, isSameAddress, viewModelToAddressUpdateInput } from './address.js';

describe('addressToViewModel', () => {
	it('should return a view model with correct properties when address is provided', () => {
		const address = {
			id: '1',
			line1: '123 Main St',
			line2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: '12345'
		};
		const result = addressToViewModel(address);
		assert.deepStrictEqual(result, {
			id: '1',
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: '12345'
		});
	});

	it('should return undefined when address is null', () => {
		const result = addressToViewModel(null);
		assert.deepStrictEqual(result, undefined);
	});
});

describe('viewModelToAddressUpdateInput', () => {
	it('should return an address update input with correct properties when edits are provided', () => {
		const edits = {
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: '12345'
		};
		const result = viewModelToAddressUpdateInput(edits);
		assert.deepStrictEqual(result, {
			line1: '123 Main St',
			line2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: '12345'
		});
	});

	it('should return null for properties that are not provided in edits', () => {
		const edits = {
			addressLine1: '123 Main St',
			townCity: 'Anytown'
		};
		const result = viewModelToAddressUpdateInput(edits);
		assert.deepStrictEqual(result, {
			line1: '123 Main St',
			line2: null,
			townCity: 'Anytown',
			county: null,
			postcode: null
		});
	});

	it('should return null for all properties when edits is null', () => {
		const result = viewModelToAddressUpdateInput(null);
		assert.deepStrictEqual(result, {
			line1: null,
			line2: null,
			townCity: null,
			county: null,
			postcode: null
		});
	});
});

describe('isAddress', () => {
	it('should return true when value has all address fields as strings', () => {
		const value = {
			addressLine1: '123 Main St',
			addressLine2: '',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: 'AA1 1AA'
		};
		assert.strictEqual(isAddress(value), true);
	});

	it('should return false when value is null', () => {
		assert.strictEqual(isAddress(null), false);
	});

	it('should return false when value is not an object', () => {
		assert.strictEqual(isAddress('not-an-object'), false);
	});

	it('should return false when value is an empty object', () => {
		assert.strictEqual(isAddress({}), false);
	});

	it('should return false when a required field is missing', () => {
		const value = {
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty'
		};
		assert.strictEqual(isAddress(value), false);
	});

	it('should return false when a required field is not a string', () => {
		const value = {
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: 12345
		};
		assert.strictEqual(isAddress(value), false);
	});
});

describe('isSameAddress', () => {
	it('should return true when all address fields match', () => {
		const a = {
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: 'AA1 1AA'
		};
		const b = {
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: 'AA1 1AA'
		};
		assert.strictEqual(isSameAddress(a, b), true);
	});

	it('should return false when any address field differs', () => {
		const a = {
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: 'AA1 1AA'
		};
		const b = {
			addressLine1: '124 Main St',
			addressLine2: 'Apt 4',
			townCity: 'Anytown',
			county: 'Anycounty',
			postcode: 'AA1 1AA'
		};
		assert.strictEqual(isSameAddress(a, b), false);
	});
});

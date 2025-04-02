import { describe, it } from 'node:test';
import assert from 'node:assert';
import { addressToViewModel, viewModelToAddressUpdateInput } from './address.js';

describe('addressToViewModel', () => {
	it('returns a view model with correct properties when address is provided', () => {
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

	it('returns an empty object when address is null', () => {
		const result = addressToViewModel(null);
		assert.deepStrictEqual(result, {});
	});
});

describe('viewModelToAddressUpdateInput', () => {
	it('returns an address update input with correct properties when edits are provided', () => {
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

	it('returns null for properties that are not provided in edits', () => {
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

	it('returns null for all properties when edits is null', () => {
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

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { nameToViewModel } from './name.js';

describe('nameToViewModel', () => {
	it('returns full name when both first and last names are provided', () => {
		const result = nameToViewModel('John', 'Doe');
		assert.strictEqual(result, 'John Doe');
	});

	it('returns first name only when last name is undefined', () => {
		const result = nameToViewModel('John', undefined);
		assert.strictEqual(result, 'John');
	});

	it('returns last name only when first name is undefined', () => {
		const result = nameToViewModel(undefined, 'Doe');
		assert.strictEqual(result, 'Doe');
	});

	it('returns undefined when both first and last names are undefined', () => {
		const result = nameToViewModel(undefined, undefined);
		assert.strictEqual(result, undefined);
	});

	it('trims extra spaces when names contain leading or trailing whitespace', () => {
		const result = nameToViewModel('  John  ', '  Doe  ');
		assert.strictEqual(result, 'John Doe');
	});
});

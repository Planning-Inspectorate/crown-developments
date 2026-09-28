import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	joinParts,
	lookupDisplayName,
	lookupDisplayNameOrDash,
	textOrDash,
	toId,
	toNumberText,
	toText
} from './values.ts';

describe('toText', () => {
	it('should trim strings', () => {
		assert.strictEqual(toText('  Test  '), 'Test');
	});

	it('should turn numbers into text', () => {
		assert.strictEqual(toText(10.5), '10.5');
	});

	it('should keep text that only looks numeric as it is', () => {
		assert.strictEqual(toText('01234567890'), '01234567890');
	});

	it('should treat empty and unexpected values as empty', () => {
		assert.strictEqual(toText(''), undefined);
		assert.strictEqual(toText('   '), undefined);
		assert.strictEqual(toText(null), undefined);
		assert.strictEqual(toText(undefined), undefined);
		assert.strictEqual(toText(Number.NaN), undefined);
		assert.strictEqual(toText({ value: 1 }), undefined);
	});
});

describe('toNumberText', () => {
	it('should normalise numeric text so it matches the number', () => {
		assert.strictEqual(toNumberText('10.40'), '10.4');
		assert.strictEqual(toNumberText('555534'), toNumberText(555534));
	});

	it('should keep non-numeric text as it is', () => {
		assert.strictEqual(toNumberText('abc'), 'abc');
	});

	it('should treat empty values as empty', () => {
		assert.strictEqual(toNumberText(''), undefined);
	});
});

describe('joinParts', () => {
	it('should join the parts that are set', () => {
		assert.strictEqual(joinParts(['One', undefined, 'Three']), 'One, Three');
	});

	it('should return "-" if no parts are set', () => {
		assert.strictEqual(joinParts([undefined, undefined]), '-');
	});
});

describe('textOrDash', () => {
	it('should return the trimmed text, or "-" if empty', () => {
		assert.strictEqual(textOrDash(' Test '), 'Test');
		assert.strictEqual(textOrDash(''), '-');
		assert.strictEqual(textOrDash(null), '-');
	});
});

describe('toId', () => {
	it('should return the ID unchanged', () => {
		assert.strictEqual(toId('org-1'), 'org-1');
	});

	it('should treat empty and non-string values as not set', () => {
		assert.strictEqual(toId(''), undefined);
		assert.strictEqual(toId(null), undefined);
		assert.strictEqual(toId(42), undefined);
	});
});

describe('lookupDisplayName', () => {
	const names = new Map([['org-1', 'Test Organisation']]);

	it('should return the display name for a known ID', () => {
		assert.strictEqual(lookupDisplayName(names, 'org-1'), 'Test Organisation');
	});

	it('should fall back to the ID if it is not known', () => {
		assert.strictEqual(lookupDisplayName(names, 'org-2'), 'org-2');
	});

	it('should return undefined, or "-" for the OrDash version, if no ID is set', () => {
		assert.strictEqual(lookupDisplayName(names, ''), undefined);
		assert.strictEqual(lookupDisplayNameOrDash(names, undefined), '-');
	});
});

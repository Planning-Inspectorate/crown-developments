import assert from 'node:assert';
import { describe, it } from 'node:test';
import { sanitiseFileName } from './file-utils.js';

describe('file-utils.js', () => {
	describe('sanitiseFileName', () => {
		it('should sanitise file that contains invalid characters in its name', () => {
			assert.strictEqual(sanitiseFileName('~$test*:<>#.pdf.'), 'test_____.pdf');
		});
		it('should not sanitise valid file name', () => {
			assert.strictEqual(sanitiseFileName('test.pdf'), 'test.pdf');
		});
	});
});

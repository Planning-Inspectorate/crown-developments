import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FILE_NAMES_REGEX } from './upload-utils.ts';

describe('upload-utils', () => {
	describe('FILE_NAMES_REGEX', () => {
		it('allows valid alphanumeric filenames with standard extensions', () => {
			assert.ok(FILE_NAMES_REGEX.test('document.pdf'));
			assert.ok(FILE_NAMES_REGEX.test('File123.docx'));
		});

		it('allows valid allowed special characters (spaces, hyphens, underscores, brackets, ampersands, single quotes)', () => {
			assert.ok(FILE_NAMES_REGEX.test("My_File-Name (1) & other's.pdf"));
			assert.ok(FILE_NAMES_REGEX.test('john.doe&test (Draft).doc'));
		});

		it('rejects consecutive apostrophes', () => {
			assert.strictEqual(FILE_NAMES_REGEX.test("O''Connor.pdf"), false);
		});

		it('rejects illegal special characters', () => {
			const illegalChars = ['*', '?', '"', '<', '>', '|', ':', '\\', '/'];

			for (const char of illegalChars) {
				assert.strictEqual(FILE_NAMES_REGEX.test(`file${char}name.pdf`), false, `Should reject character: ${char}`);
			}
		});
	});
});

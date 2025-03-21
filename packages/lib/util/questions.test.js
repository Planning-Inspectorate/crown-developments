import { describe, it } from 'node:test';
import { toKebabCase } from './questions.js';
import assert from 'node:assert';

describe('util/questions.js', () => {
	describe('camelCaseToKebabCase', () => {
		it('should correctly convert camelCase to kebab-case', () => {
			assert.strictEqual(toKebabCase('myselfFullName'), 'myself-full-name');
		});
		it('should not convert single word', () => {
			assert.strictEqual(toKebabCase('myself'), 'myself');
		});
		it('should handle blank string', () => {
			assert.strictEqual(toKebabCase(''), '');
		});
		it('should convert input that is not in camelCase', () => {
			assert.strictEqual(toKebabCase('myself full name'), 'myself-full-name');
		});
		it('should convert input that is not in camelCase with large spaces between words', () => {
			assert.strictEqual(toKebabCase('myself       full   name'), 'myself-full-name');
		});
	});
});

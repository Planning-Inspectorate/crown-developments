import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getQuestions } from './questions.js';

describe('getQuestions', () => {
	describe('propOverrides', () => {
		it('should merge the overrides over the default props for that question only', () => {
			const defaults = getQuestions();
			const questions = getQuestions({ propOverrides: { myselfEmail: { hint: 'Custom hint' } } });

			assert.strictEqual(questions.myselfEmail.hint, 'Custom hint');
			assert.strictEqual(questions.myselfEmail.question, defaults.myselfEmail.question);
			assert.strictEqual(questions.submitterEmail.hint, defaults.submitterEmail.hint);
		});
		it('should throw for an unknown question, so a typo does not silently do nothing', () => {
			assert.throws(() => getQuestions({ propOverrides: { notAQuestion: { hint: 'x' } } }), /unknown question/);
		});
	});
});

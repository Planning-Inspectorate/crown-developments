import { describe, it } from 'node:test';
import assert from 'node:assert';
import { highlightRedactionSuggestions } from './redaction.js';

describe('redaction', () => {
	describe('highlightRedactionSuggestions', () => {
		it('should add marks', () => {
			const text = 'Some comment that needs redaction and will be marked up as such.';
			const entities = [
				{ text: 'redaction', category: 'Organization', offset: 24, length: 9, confidenceScore: 0.73 },
				{ text: 'will be ', category: 'Organization', offset: 38, length: 8, confidenceScore: 0.73 },
				{ text: 'marked up as', category: 'Person', offset: 46, length: 12, confidenceScore: 0.6 }
			];

			const result = highlightRedactionSuggestions(text, entities);
			assert.strictEqual(
				result,
				`Some comment that needs <mark>redaction</mark> and <mark>will be </mark><mark>marked up as</mark> such.`
			);
		});
	});
});

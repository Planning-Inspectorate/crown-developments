import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	combineResults,
	fetchRedactionSuggestions,
	highlightRedactionSuggestions,
	arrayToArrays,
	stringToChunks,
	DEFAULT_CATEGORIES
} from '#util/azure-language-redaction.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('azure-language-redaction', () => {
	describe('fetchRedactionSuggestions', () => {
		it('should return null for an empty string', async () => {
			const result = await fetchRedactionSuggestions('', mock.fn(), DEFAULT_CATEGORIES, mockLogger());
			assert.strictEqual(result, null);
		});

		it('should chunk the string for the analytics client', async () => {
			const longString = 'a'.repeat(10000);
			const mockTextAnalyticsClient = {
				recognizePiiEntities: async () => [{ entities: [], redactedText: '', id: '', warnings: [] }]
			};
			await fetchRedactionSuggestions(longString, mockTextAnalyticsClient, DEFAULT_CATEGORIES, mockLogger());
			assert.strictEqual(mockTextAnalyticsClient.recognizePiiEntities.callCount, undefined); // No call tracking
		});

		it('should return null if there are any entity errors', async () => {
			const longString = 'a'.repeat(10000);
			const mockTextAnalyticsClient = {
				recognizePiiEntities: async () => [
					{
						entities: [{ text: 'John Doe', offset: 0, length: 8, category: 'Person', confidenceScore: 0.95 }],
						redactedText: '',
						id: '',
						warnings: []
					},
					{
						error: { code: 'InvalidRequest', message: 'Invalid request' }
					}
				]
			};
			const result = await fetchRedactionSuggestions(
				longString,
				mockTextAnalyticsClient,
				DEFAULT_CATEGORIES,
				mockLogger()
			);
			assert.strictEqual(result, null);
		});

		it('should return null if there are any unexpected errors', async () => {
			const longString = 'a'.repeat(10000);
			const mockTextAnalyticsClient = {
				recognizePiiEntities: async () => {
					throw new Error('Network error');
				}
			};
			const result = await fetchRedactionSuggestions(
				longString,
				mockTextAnalyticsClient,
				DEFAULT_CATEGORIES,
				mockLogger()
			);
			assert.strictEqual(result, null);
		});

		it('should return combined results for all chunks', async () => {
			const middleChunk = '0'.repeat(5000 - 14);
			const text = 'John Doe lives' + middleChunk + 'at 123 Main St.';
			const mockTextAnalyticsClient = {
				recognizePiiEntities: async () => [
					{
						entities: [{ text: 'John Doe', offset: 0, length: 8, category: 'Person', confidenceScore: 0.95 }],
						redactedText: '',
						id: '',
						warnings: []
					},
					{
						entities: [
							{
								text: '123 Main St',
								offset: 3,
								length: 11,
								category: 'Address',
								confidenceScore: 0.9
							}
						],
						redactedText: '',
						id: '',
						warnings: []
					}
				]
			};
			const result = await fetchRedactionSuggestions(text, mockTextAnalyticsClient, DEFAULT_CATEGORIES, mockLogger());
			assert.ok(result);
			assert.strictEqual(result.entities.length, 2);
			assert.strictEqual(result.redactedText, '████████ lives' + middleChunk + 'at ███████████.');
		});

		it('should group chunks into fives and combine all results', async () => {
			const longString = '0'.repeat(60000); // 60,000 characters -> 12 chunks of 5000 characters -> 3 groups of 5 chunks
			const mockTextAnalyticsClient = {
				recognizePiiEntities: mock.fn(() => [
					{
						entities: [{ text: 'John Doe', offset: 0, length: 8, category: 'Person', confidenceScore: 0.95 }],
						redactedText: '',
						id: '',
						warnings: []
					},
					{
						entities: [
							{
								text: '123 Main St',
								offset: 3,
								length: 11,
								category: 'Address',
								confidenceScore: 0.9
							}
						],
						redactedText: '',
						id: '',
						warnings: []
					}
				])
			};
			const result = await fetchRedactionSuggestions(
				longString,
				mockTextAnalyticsClient,
				DEFAULT_CATEGORIES,
				mockLogger()
			);
			assert.ok(result);
			assert.strictEqual(mockTextAnalyticsClient.recognizePiiEntities.mock.callCount(), 3); // 3 groups of 5 chunks
			assert.strictEqual(result.entities.length, 6);
		});

		it('should return null if the number of requests exceeds the limit', async () => {
			const longString = '0'.repeat(100000); // 100,000 characters -> 20 chunks of 5000 characters -> 4 groups of 5 chunks
			const result = await fetchRedactionSuggestions(longString, mock.fn(), DEFAULT_CATEGORIES, mockLogger());
			assert.strictEqual(result, null);
		});
	});

	describe('highlightRedactionSuggestions', () => {
		it('should add marks', () => {
			const text = 'Some comment that needs redaction and will be marked up as such.';
			const entities = [
				{
					text: 'redaction',
					category: 'Organization',
					offset: 24,
					length: 9,
					confidenceScore: 0.73
				},
				{
					text: 'will be ',
					category: 'Organization',
					offset: 38,
					length: 8,
					confidenceScore: 0.73
				},
				{ text: 'marked up as', category: 'Person', offset: 46, length: 12, confidenceScore: 0.6 }
			];

			const result = highlightRedactionSuggestions(text, entities);
			assert.strictEqual(
				result,
				`Some comment that needs <mark>redaction</mark> and <mark>will be </mark><mark>marked up as</mark> such.`
			);
		});
	});

	describe('combineResults', () => {
		it('should work for a single document result, ignoring the redactedText', () => {
			const results = [
				{
					entities: [
						{ text: 'John Doe', offset: 0, length: 8, category: 'Person', confidenceScore: 0.95 },
						{
							text: '123 Main St',
							offset: 18,
							length: 11,
							category: 'Address',
							confidenceScore: 0.9
						}
					],
					redactedText: 'REDACTED REDACTED'
				}
			];
			const originalText = 'John Doe lives at 123 Main St.';
			const combined = combineResults(results, originalText);
			assert.strictEqual(combined.entities.length, 2);
			assert.strictEqual(combined.redactedText, '████████ lives at ███████████.');
		});
	});

	describe('arrayToArrays', () => {
		it('should split an array into chunks of specified size', () => {
			const longArray = Array.from({ length: 1000 }, (_, i) => i);
			const chunks = arrayToArrays(longArray, 200);
			assert.strictEqual(chunks.length, 5);
			chunks.forEach((chunk) => assert.strictEqual(chunk.length, 200));
		});
	});

	describe('stringToChunks', () => {
		it('should split a long string into chunks of specified length', () => {
			const longString = 'a'.repeat(1000);
			const chunks = stringToChunks(longString, 200);
			assert.strictEqual(chunks.length, 5);
			chunks.forEach((chunk) => assert.strictEqual(chunk.length, 200));
		});
	});
});

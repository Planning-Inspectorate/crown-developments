import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { generateNewReference, uniqueReference } from './random-reference.js';

describe('random-reference', () => {
	describe('generateRepresentationReference', () => {
		it('should generate a unique reference', async () => {
			const mockDb = {
				representation: {
					count: async () => 0
				}
			};
			const reference = await uniqueReference(mockDb, () => 'AAAAA-BBBBB');
			assert.strictEqual(reference, 'AAAAA-BBBBB');
		});
		it('should error throw after maximum tries', async () => {
			const mockDb = {
				representation: {
					count: async () => 1
				}
			};
			await assert.rejects(() => uniqueReference(mockDb, () => 'AAAAA-BBBBB'), {
				message: 'unable to generate a unique reference'
			});
		});
		it('should not return a reference that already exists', async () => {
			let referenceIndex = 0;
			const mockGenerateNewReference = mock.fn(() => {
				const references = ['AAAAA-BBBBB', 'CCCCC-DDDDD'];
				return references[referenceIndex++];
			});

			const mockDb = {
				representation: {
					count: async (args) => (args.where.reference === 'AAAAA-BBBBB' ? 1 : 0)
				}
			};
			const reference = await uniqueReference(mockDb, mockGenerateNewReference);
			assert.strictEqual(reference, 'CCCCC-DDDDD');
			assert.strictEqual(mockGenerateNewReference.mock.callCount(), 2);
		});
	});

	describe('newReference', () => {
		it('should generate a new reference using the "AAAAA-BBBBB" format', () => {
			const reference = generateNewReference();
			assert.strictEqual(reference.length, 11);
			assert.strictEqual(reference[5], '-');
		});
		it('should generate references with valid characters', () => {
			const reference = generateNewReference();
			assert.ok(/^[A-Z0-9-]+$/.test(reference));
		});
	});
});

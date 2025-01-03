import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { newReference } from './save.js';

describe('save', () => {
	describe('newReference', () => {
		const dbMock = () => {
			return {
				crownDevelopment: {
					findMany: mock.fn(() => [])
				}
			};
		};
		it('should start from 1 if no cases', async () => {
			const db = dbMock();
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0000001');
		});
		it('should ignore bad references', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [{ reference: 'bad-ref/here' }]);
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0000001');
		});
		it('should increment final part of reference', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [{ reference: 'CROWN/2024/0123456' }]);
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0123457');
		});
		it('should ignore date from latest case', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [{ reference: 'CROWN/2022/0123456' }]);
			const ref = await newReference(db, new Date('2026-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2026/0123457');
		});
	});
});

import assert from 'assert';
import { describe, it } from 'node:test';
import { APPLICATION_PUBLISH_STATUS } from '@pins/crowndev-lib/util/applications.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from './view-model.ts';

describe('s62aCaseToViewModel', () => {
	it('should map id and reference correctly when S62aDates is not present', () => {
		const mockCase = {
			id: 's62a-1',
			reference: 'REF-001'
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.deepStrictEqual(result, {
			id: 's62a-1',
			reference: 'REF-001'
		});
		assert.strictEqual(result.applicationStatus, undefined);
	});

	it('should not set applicationStatus if withdrawnDate is not present in S62aDates', () => {
		const mockCase = {
			id: 's62a-2',
			reference: 'REF-002',
			S62aDates: {
				publishDate: new Date('2025-01-01T00:00:00Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.deepStrictEqual(result, {
			id: 's62a-2',
			reference: 'REF-002'
		});
		assert.strictEqual(result.applicationStatus, undefined);
	});

	it('should set applicationStatus to ACTIVE when withdrawnDate is null', () => {
		const mockCase = {
			id: 's62a-3',
			reference: 'REF-003',
			S62aDates: {
				withdrawnDate: null
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.ACTIVE);
	});

	it('should set applicationStatus based on withdrawnDate when it is in the past', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-02-23T00:00:00.000Z') });

		const mockCase = {
			id: 's62a-4',
			reference: 'REF-004',
			S62aDates: {
				withdrawnDate: new Date('2024-02-22T23:59:59.000Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.EXPIRED);
	});

	it('should set applicationStatus based on withdrawnDate when it is less than a year ago', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-02-23T00:00:00.000Z') });

		const mockCase = {
			id: 's62a-5',
			reference: 'REF-005',
			S62aDates: {
				withdrawnDate: new Date('2025-02-22T00:00:00.000Z')
			}
		} as unknown as S62aCaseWithRelations;

		const result = s62aCaseToViewModel(mockCase);

		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.WITHDRAWN);
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s62aCaseToViewModel, type S62aCaseDbModel } from './view-model.ts';

describe('s62aCaseToViewModel', () => {
	it('maps a full database record to the view model correctly', () => {
		const mockDbCase = {
			id: 'case-123',
			reference: 'S62A/2026/0001',
			description: 'A massive new development',
			S62aStatus: {
				id: 'status-new',
				displayName: 'New'
			}
		} as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.deepStrictEqual(result, {
			id: 'case-123',
			reference: 'S62A/2026/0001',
			developmentDescription: 'A massive new development',
			s62aStatusId: 'status-new'
		});
	});

	it('handles a missing or null status gracefully', () => {
		const mockDbCase = {
			id: 'case-456',
			reference: 'S62A/2026/0002',
			description: 'Another development',
			S62aStatus: null
		} as unknown as S62aCaseDbModel;

		const result = s62aCaseToViewModel(mockDbCase);

		assert.deepStrictEqual(result, {
			id: 'case-456',
			reference: 'S62A/2026/0002',
			developmentDescription: 'Another development',
			s62aStatusId: undefined
		});
	});
});

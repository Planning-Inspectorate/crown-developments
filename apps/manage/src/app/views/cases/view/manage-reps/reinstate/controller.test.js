import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildReinstateRepConfirmation } from './controller.js';

describe('reinstate rep controller', () => {
	describe('buildReinstateRepConfirmation', () => {
		it('should render reinstate rep confirmation page', async () => {
			const mockReq = { params: { id: 'case-1', representationRef: 'ABCDE-12345' } };
			const mockRes = { render: mock.fn() };
			const reinstateRepConfirmation = buildReinstateRepConfirmation();

			await reinstateRepConfirmation(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Reinstate representation',
				representationRef: 'ABCDE-12345',
				backLinkUrl: '/cases/case-1/manage-representations'
			});
		});
	});
});

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
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const reinstateRepConfirmation = buildReinstateRepConfirmation();

			await assert.rejects(() => reinstateRepConfirmation(mockReq, mockRes), {
				message: 'id param required'
			});
		});
		it('should throw if no representationRef', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			const reinstateRepConfirmation = buildReinstateRepConfirmation();

			await assert.rejects(() => reinstateRepConfirmation(mockReq, mockRes), {
				message: 'representationRef param required'
			});
		});
	});
});

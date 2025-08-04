import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildReinstateRepresentationController, reinstateRepConfirmation, successController } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { Prisma } from '@prisma/client';

describe('reinstate rep controller', () => {
	describe('buildReinstateRepConfirmation', () => {
		it('should render reinstate rep confirmation page', () => {
			const mockReq = { params: { id: 'case-1', representationRef: 'ABCDE-12345' } };
			const mockRes = { render: mock.fn() };

			reinstateRepConfirmation(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Reinstate representation',
				representationRef: 'ABCDE-12345',
				backLinkUrl: '/cases/case-1/manage-representations'
			});
		});
	});
	describe('buildReinstateRepresentationController', () => {
		it('should reinstate representation and redirect to success page', async () => {
			const mockReq = { params: { id: 'case-12345', representationRef: 'ABCDE-12345' } };
			const mockRes = { redirect: mock.fn() };

			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({ id: 'rep-id-12345', preWithdrawalStatusId: 'approved' }))
				},
				withdrawalRequestDocument: {
					deleteMany: mock.fn()
				}
			};
			const reinstateRepresentationController = buildReinstateRepresentationController({
				db: mockDb,
				logger: mockLogger()
			});

			await reinstateRepresentationController(mockReq, mockRes);

			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.withdrawalRequestDocument.deleteMany.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
		});
		it('should throw error if error encountered updating database', async () => {
			const mockReq = { params: { id: 'case-12345', representationRef: 'ABCDE-12345' } };
			const mockRes = { redirect: mock.fn() };

			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1' });
					}),
					findUnique: mock.fn(() => ({ id: 'rep-id-12345', preWithdrawalStatusId: 'approved' }))
				},
				withdrawalRequestDocument: {
					deleteMany: mock.fn()
				}
			};
			const reinstateRepresentationController = buildReinstateRepresentationController({
				db: mockDb,
				logger: mockLogger()
			});

			await assert.rejects(() => reinstateRepresentationController(mockReq, mockRes));
		});
	});
	describe('successController', () => {
		it('should render reinstate rep success page', () => {
			const mockReq = { params: { id: 'case-1', representationRef: 'ABCDE-12345' } };
			const mockRes = { render: mock.fn() };

			successController(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				title: 'Representation reinstated',
				bodyText: `Representation reference <br><strong>ABCDE-12345</strong>`,
				successBackLinkUrl: '/cases/case-1/manage-representations',
				successBackLinkText: 'Back to overview'
			});
		});
	});
});

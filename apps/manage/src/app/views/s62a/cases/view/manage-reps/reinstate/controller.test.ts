import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildReinstateRepresentationController, reinstateRepConfirmation, successController } from './controller.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';

describe('s62a reinstate rep controller', () => {
	describe('reinstateRepConfirmation', () => {
		it('should render reinstate rep confirmation page', () => {
			const mockReq = { params: { id: 'case-1', representationRef: 'ABCDE-12345' } } as unknown as Request;
			const mockRes = { render: mock.fn() } as unknown as Response;

			reinstateRepConfirmation(mockReq, mockRes);

			assert.strictEqual((mockRes.render as any).mock.callCount(), 1);
			assert.strictEqual(
				(mockRes.render as any).mock.calls[0].arguments[0],
				'views/s62a/cases/view/manage-reps/reinstate/view.njk'
			);
			assert.deepStrictEqual((mockRes.render as any).mock.calls[0].arguments[1], {
				pageTitle: 'Reinstate representation',
				representationRef: 'ABCDE-12345',
				backLinkUrl: '/s62a/cases/case-1/manage-representations/ABCDE-12345/view'
			});
		});
	});

	describe('buildReinstateRepresentationController', () => {
		it('should reinstate representation and redirect to success page', async () => {
			const mockReq = {
				params: { id: 'case-12345', representationRef: 'ABCDE-12345' },
				baseUrl: '/s62a/cases/case-12345'
			} as unknown as Request;
			const mockRes = { redirect: mock.fn() } as unknown as Response;

			const mockDb = {
				$transaction: mock.fn((fn: any) => fn(mockDb)),
				s62aRepresentation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({ id: 'rep-id-12345', preWithdrawalStatusId: 'approved' }))
				},
				blobWithdrawalRequestDocument: {
					deleteMany: mock.fn()
				}
			};

			const reinstateRepresentationController = buildReinstateRepresentationController({
				db: mockDb,
				logger: mockLogger()
			} as unknown as ManageService);

			await reinstateRepresentationController(mockReq, mockRes);

			assert.strictEqual(mockDb.s62aRepresentation.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockDb.s62aRepresentation.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.blobWithdrawalRequestDocument.deleteMany.mock.callCount(), 1);
			assert.strictEqual((mockRes.redirect as any).mock.callCount(), 1);

			const redirectUrl = (mockRes.redirect as any).mock.calls[0].arguments[0];
			assert.ok(redirectUrl === '/s62a/cases/case-12345/view/reinstate-representation-success' || redirectUrl === '/');
		});

		it('should throw error if error encountered updating database', async () => {
			const mockReq = {
				params: { id: 'case-12345', representationRef: 'ABCDE-12345' },
				baseUrl: '/s62a/cases/case-12345'
			} as unknown as Request;
			const mockRes = { redirect: mock.fn() } as unknown as Response;

			const mockDb = {
				$transaction: mock.fn((fn: any) => fn(mockDb)),
				s62aRepresentation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1', clientVersion: '1.0' });
					}),
					findUnique: mock.fn(() => ({ id: 'rep-id-12345', preWithdrawalStatusId: 'approved' }))
				},
				blobWithdrawalRequestDocument: {
					deleteMany: mock.fn()
				}
			};

			const reinstateRepresentationController = buildReinstateRepresentationController({
				db: mockDb,
				logger: mockLogger()
			} as unknown as ManageService);

			await assert.rejects(() => reinstateRepresentationController(mockReq, mockRes));
		});
	});

	describe('successController', () => {
		it('should render reinstate rep success page', () => {
			const mockReq = { params: { id: 'case-1', representationRef: 'ABCDE-12345' } } as unknown as Request;
			const mockRes = { render: mock.fn() } as unknown as Response;

			successController(mockReq, mockRes);

			assert.strictEqual((mockRes.render as any).mock.callCount(), 1);
			assert.strictEqual(
				(mockRes.render as any).mock.calls[0].arguments[0],
				'views/s62a/cases/view/manage-reps/reinstate/success.njk'
			);
			assert.deepStrictEqual((mockRes.render as any).mock.calls[0].arguments[1], {
				title: 'Representation reinstated',
				bodyText: `Representation reference <br><strong>ABCDE-12345</strong>`,
				successBackLinkUrl: '/s62a/cases/case-1/manage-representations',
				successBackLinkText: 'Back to overview'
			});
		});
	});
});

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, successController } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { Prisma } from '@prisma/client';

describe('withdraw rep controller', () => {
	describe('buildSaveController', () => {
		it('should handle withdrawal submission, clear session data and redirect to success page', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' }))
				},
				representation: {
					findUnique: mock.fn(() => ({ id: 'rep-1' })),
					update: mock.fn()
				},
				withdrawalRequestDocument: {
					createMany: mock.fn()
				}
			};
			const mockSharepointDrive = {
				moveItemsToFolder: mock.fn(),
				addNewFolder: mock.fn(() => ({ id: 'sub-folder-id' })),
				getDriveItemByPath: mock.fn(() => ({ id: 'folder-id' })),
				deleteItemsRecursivelyById: mock.fn()
			};
			const mockService = {
				db: mockDb,
				logger: mockLogger(),
				getSharePointDrive: () => mockSharepointDrive,
				appName: 'manage'
			};

			const mockReq = {
				baseUrl: '/cases/case-1/manage-representations/case-1-ref/view/withdraw-representation',
				params: { id: 'case-1', representationRef: 'case-1-ref' },
				session: {
					forms: {
						'withdraw-representation': {
							withdrawalRequestDate: '2025-01-01',
							withdrawalReasonId: 'change-of-opinion',
							withdrawalRequests: [
								{ itemId: 'file-1', fileName: 'file1.pdf' },
								{ itemId: 'file-2', fileName: 'file2.pdf' }
							]
						}
					},
					files: {
						'case-1-ref': {
							withdraw: [
								{ itemId: 'file-1', fileName: 'file1.pdf' },
								{ itemId: 'file-2', fileName: 'file2.pdf' }
							]
						}
					}
				}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							withdrawalRequestDate: '2025-01-01',
							withdrawalReasonId: 'change-of-opinion',
							withdrawalRequests: [
								{ itemId: 'file-1', fileName: 'file1.pdf' },
								{ itemId: 'file-2', fileName: 'file2.pdf' }
							]
						}
					}
				}
			};

			const saveController = buildSaveController(mockService);

			await saveController(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/cases/case-1/manage-representations/case-1-ref/view/withdraw-representation/success'
			);

			assert.deepStrictEqual(mockReq.session.files, { 'case-1-ref': {} });
			assert.deepStrictEqual(mockReq.session.forms, {});

			assert.strictEqual(mockSharepointDrive.getDriveItemByPath.mock.callCount(), 2);
			assert.strictEqual(mockSharepointDrive.addNewFolder.mock.callCount(), 1);
			assert.strictEqual(mockSharepointDrive.moveItemsToFolder.mock.callCount(), 1);
			assert.strictEqual(mockSharepointDrive.deleteItemsRecursivelyById.mock.callCount(), 1);
		});
		it('should throw prisma error if error saving data to db', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' }))
				},
				representation: {
					findUnique: mock.fn(() => ({ id: 'rep-1' })),
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E101' });
					})
				},
				withdrawalRequestDocument: {
					createMany: mock.fn()
				}
			};
			const mockService = {
				db: mockDb,
				logger: mockLogger(),
				getSharePointDrive: () => {},
				appName: 'manage'
			};

			const mockReq = {
				baseUrl: '/cases/case-1/manage-representations/case-1-ref/view/withdraw-representation',
				params: { id: 'case-1', representationRef: 'case-1-ref' },
				session: {
					forms: {
						'withdraw-representation': {
							withdrawalRequestDate: '2025-01-01',
							withdrawalReasonId: 'change-of-opinion',
							withdrawalRequests: [
								{ itemId: 'file-1', fileName: 'file1.pdf' },
								{ itemId: 'file-2', fileName: 'file2.pdf' }
							]
						}
					},
					files: {
						'case-1': {
							'withdraw-representation': [
								{ itemId: 'file-1', fileName: 'file1.pdf' },
								{ itemId: 'file-2', fileName: 'file2.pdf' }
							]
						}
					}
				}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							withdrawalRequestDate: '2025-01-01',
							withdrawalReasonId: 'change-of-opinion',
							withdrawalRequests: [
								{ itemId: 'file-1', fileName: 'file1.pdf' },
								{ itemId: 'file-2', fileName: 'file2.pdf' }
							]
						}
					}
				}
			};

			const saveController = buildSaveController(mockService);

			await assert.rejects(() => saveController(mockReq, mockRes));
		});
	});
	describe('successController', () => {
		it('should render reinstate rep confirmation page', () => {
			const mockReq = {
				baseUrl: '/cases/case-1/manage-representations/ABCDE-12345/view/withdraw-representation',
				params: {
					id: 'case-1',
					representationRef: 'ABCDE-12345'
				}
			};
			const mockRes = { render: mock.fn() };

			successController(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				bodyText: 'Representation reference <br><strong>ABCDE-12345</strong>',
				successBackLinkText: 'Go back to overview',
				successBackLinkUrl: '/cases/case-1/manage-representations/ABCDE-12345/view',
				title: 'Representation Withdrawn'
			});
		});
		it('should throw if no id', () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };

			assert.throws(() => successController(mockReq, mockRes), {
				message: 'id param required'
			});
		});
		it('should throw if no representationRef', () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };

			assert.throws(() => successController(mockReq, mockRes), {
				message: 'representationRef param required'
			});
		});
	});
});

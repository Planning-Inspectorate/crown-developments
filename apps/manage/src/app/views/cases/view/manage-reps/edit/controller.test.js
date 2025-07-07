import { describe, it, mock } from 'node:test';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import assert from 'node:assert';
import { buildUpdateRepresentation } from './controller.js';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { Prisma } from '@prisma/client';

describe('controller', () => {
	describe('buildUpdateRepresentation', () => {
		it('should throw if no params', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const updateRep = buildUpdateRepresentation({ db: mockDb, logger });
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			await assert.rejects(() => updateRep({ req: mockReq, res: mockRes, data: {} }), {
				message: 'representationRef param required'
			});
		});
		it('should do nothing if no edits', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const mockSharePoint = mock.fn();
			const logger = mockLogger();
			const updateRep = buildUpdateRepresentation({ db: mockDb, logger, getSharePointDrive: () => mockSharePoint });
			const mockReq = { params: { id: 'case-1', representationRef: 'ref-1' } };
			const mockRes = { locals: {} };
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: {} }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 0);
			assert.strictEqual(logger.info.mock.callCount(), 1);
			assert.strictEqual(logger.info.mock.calls[0].arguments[1], 'no representation updates to apply');
		});
		it('should call update with edits', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const mockSharePoint = mock.fn();
			const updateRep = buildUpdateRepresentation({ db: mockDb, logger, getSharePointDrive: () => mockSharePoint });
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1'
				}
			};
			const mockRes = { locals: {} };
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			const updateArgs = mockDb.representation.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs?.where?.reference, 'ref-1');
			assert.strictEqual(updateArgs?.data?.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(logger.info.mock.callCount(), 1);
			assert.strictEqual(logger.info.mock.calls[0].arguments[1], 'update representation input');
			assert.strictEqual(mockReq.session.representations['ref-1'].representationUpdated, true);
		});
		it('should create folder if contains attachments and share point folder not yet created', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				mock.fn,
				mock.fn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: true
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'no'
						}
					}
				}
			};
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			assert.strictEqual(mockSharePoint.addNewFolder.mock.callCount(), 1);
			assert.strictEqual(
				mockSharePoint.addNewFolder.mock.calls[0].arguments[0],
				'CROWN-2025-0000001/Published/RepresentationAttachments'
			);
			assert.strictEqual(mockSharePoint.addNewFolder.mock.calls[0].arguments[1], 'ref-1');
		});
		it('should create folder if contains attachments and sharePointFolderCreated is undefined', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				mock.fn,
				mock.fn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: true
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001'
						}
					}
				}
			};
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			assert.strictEqual(mockSharePoint.addNewFolder.mock.callCount(), 1);
			assert.strictEqual(
				mockSharePoint.addNewFolder.mock.calls[0].arguments[0],
				'CROWN-2025-0000001/Published/RepresentationAttachments'
			);
			assert.strictEqual(mockSharePoint.addNewFolder.mock.calls[0].arguments[1], 'ref-1');
		});
		it('should not create folder if contains attachments not in data to be saved', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				mock.fn,
				mock.fn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1'
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'no'
						}
					}
				}
			};
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			assert.strictEqual(mockSharePoint.addNewFolder.mock.callCount(), 0);
		});
		it('should not create folder if contains attachments is true but folder already created', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				mock.fn,
				mock.fn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: true
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'yes'
						}
					}
				}
			};
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			assert.strictEqual(mockSharePoint.addNewFolder.mock.callCount(), 0);
		});
		it('should throw if error creating folder', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn(() => {
					throw new Error('Error creating folder');
				})
			};

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				mock.fn,
				mock.fn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: true
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'no'
						}
					}
				}
			};
			await assert.rejects(() => updateRep({ req: mockReq, res: mockRes, data: edits }), {
				message: 'Error encountered during sharepoint folder creation'
			});
		});
		it('should update representation with attachments', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => {
						return { id: '12345' };
					})
				},
				representationDocument: { createMany: mock.fn() },
				$transaction: mock.fn((fn) => fn(mockDb))
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};
			const moveAttachmentsToCaseFolderFn = mock.fn();
			const deleteRepresentationAttachmentsFolderFn = mock.fn();

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				moveAttachmentsToCaseFolderFn,
				deleteRepresentationAttachmentsFolderFn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: true,
					myselfAttachments: [
						{
							itemId: 'item-1',
							fileName: 'attachment-1.pdf'
						}
					]
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'no'
						}
					}
				}
			};
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockDb.representation.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockDb.representationDocument.createMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.representationDocument.createMany.mock.calls[0].arguments[0].data.length, 1);
			assert.deepStrictEqual(mockDb.representationDocument.createMany.mock.calls[0].arguments[0].data[0], {
				representationId: '12345',
				itemId: 'item-1',
				fileName: 'attachment-1.pdf',
				statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
			});
			assert.strictEqual(deleteRepresentationAttachmentsFolderFn.mock.callCount(), 1);
		});
		it('should handle prisma error when updating attachments', async () => {
			const mockDb = {
				representation: { update: mock.fn() },
				$transaction: mock.fn(() => {
					throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1' });
				})
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};
			const moveAttachmentsToCaseFolderFn = mock.fn();

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				moveAttachmentsToCaseFolderFn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: true,
					myselfAttachments: [
						{
							itemId: 'item-1',
							fileName: 'attachment-1.pdf'
						}
					]
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'no'
						}
					}
				}
			};
			await assert.rejects(
				() => updateRep({ req: mockReq, res: mockRes, data: edits }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error adding representation attachments (E1)');
					return true;
				}
			);
		});
		it('should handle prisma errors when updating representation', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1' });
					})
				}
			};
			const logger = mockLogger();
			const mockSharePoint = {
				addNewFolder: mock.fn()
			};
			const moveAttachmentsToCaseFolderFn = mock.fn();

			const updateRep = buildUpdateRepresentation(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				moveAttachmentsToCaseFolderFn
			);

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {}
			};
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1',
					containsAttachments: false
				}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReference: 'CROWN-2025-0000001',
							sharePointFolderCreated: 'no'
						}
					}
				}
			};
			await assert.rejects(
				() => updateRep({ req: mockReq, res: mockRes, data: edits }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error updating representation (E1)');
					return true;
				}
			);
		});
	});
});

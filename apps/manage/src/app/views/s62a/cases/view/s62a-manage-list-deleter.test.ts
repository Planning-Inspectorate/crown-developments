import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { S62aManageListDeleter } from './s62a-manage-list-deleter.ts';
import type { ManageService } from '../../../../service.js';

describe('S62aManageListDeleter', () => {
	let mockDb: any;
	let mockLogger: any;
	let mockService: ManageService;
	let deleter: S62aManageListDeleter;

	beforeEach(() => {
		mockDb = {
			s62aToApplicant: {
				deleteMany: mock.fn(async () => {}),
				findFirst: mock.fn(async () => null)
			},
			organisation: {
				findUnique: mock.fn(async () => ({ addressId: 'addr-123' })),
				delete: mock.fn(async () => {})
			},
			organisationToContact: {
				findMany: mock.fn(async () => [{ contactId: 'contact-1' }, { contactId: 'contact-2' }]),
				deleteMany: mock.fn(async () => {})
			},
			address: {
				delete: mock.fn(async () => {})
			},
			contact: {
				delete: mock.fn(async () => {}),
				deleteMany: mock.fn(async () => {})
			},
			$transaction: mock.fn(async (ops: any[]) => Promise.all(ops))
		};

		mockLogger = {
			warn: mock.fn(),
			info: mock.fn()
		};

		mockService = {
			db: mockDb,
			logger: mockLogger
		} as unknown as ManageService;

		deleter = new S62aManageListDeleter(mockService);
	});

	describe('deleteApplicantOrganisations', () => {
		it('deletes the link, organisation, address, and orphaned contacts when not referenced elsewhere', async () => {
			await deleter.deleteApplicantOrganisations('case-1', 'org-1');

			assert.strictEqual(mockDb.s62aToApplicant.deleteMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aToApplicant.deleteMany.mock.calls[0].arguments[0], {
				where: { s62aId: 'case-1', organisationId: 'org-1', roleId: ORGANISATION_ROLES_ID.APPLICANT }
			});

			assert.strictEqual(mockDb.s62aToApplicant.findFirst.mock.callCount(), 1);

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockDb.organisationToContact.deleteMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.organisation.delete.mock.callCount(), 1);

			assert.strictEqual(mockDb.address.delete.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.address.delete.mock.calls[0].arguments[0], {
				where: { id: 'addr-123' }
			});

			assert.strictEqual(mockDb.contact.deleteMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.contact.deleteMany.mock.calls[0].arguments[0], {
				where: {
					id: { in: ['contact-1', 'contact-2'] },
					OrganisationToContact: { none: {} }
				}
			});
		});

		it('returns early and only deletes the case link if the organisation is still referenced elsewhere', async () => {
			mockDb.s62aToApplicant.findFirst = mock.fn(async () => ({ id: 'other-link' }));

			await deleter.deleteApplicantOrganisations('case-1', 'org-1');

			assert.strictEqual(mockDb.s62aToApplicant.deleteMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.s62aToApplicant.findFirst.mock.callCount(), 1);

			assert.strictEqual(mockDb.organisation.findUnique.mock.callCount(), 0);
			assert.strictEqual(mockDb.$transaction.mock.callCount(), 0);
			assert.strictEqual(mockDb.address.delete.mock.callCount(), 0);
			assert.strictEqual(mockDb.contact.deleteMany.mock.callCount(), 0);
		});

		it('logs a warning and continues if address deletion fails', async () => {
			const testError = new Error('Address constraint failed');
			mockDb.address.delete = mock.fn(() => Promise.reject(testError));

			await deleter.deleteApplicantOrganisations('case-1', 'org-1');

			assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
			assert.strictEqual(mockLogger.warn.mock.calls[0].arguments[1], 'Unable to delete address record.');

			assert.strictEqual(mockDb.contact.deleteMany.mock.callCount(), 1);
		});

		it('logs a warning if the main cleanup block throws an error', async () => {
			const testError = new Error('Transaction failed');
			mockDb.$transaction = mock.fn(() => Promise.reject(testError));

			await deleter.deleteApplicantOrganisations('case-1', 'org-1');

			assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
			assert.strictEqual(
				mockLogger.warn.mock.calls[0].arguments[1],
				'Unable to delete Organisation record (may still be referenced)'
			);
		});
	});

	describe('deleteApplicantContactDetails', () => {
		it('deletes case-to-contact link, org-to-contact link, and attempts to delete contact', async () => {
			await deleter.deleteApplicantContactDetails('case-1', 'contact-1');

			assert.strictEqual(mockDb.s62aToApplicant.deleteMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aToApplicant.deleteMany.mock.calls[0].arguments[0], {
				where: { s62aId: 'case-1', contactId: 'contact-1', roleId: ORGANISATION_ROLES_ID.APPLICANT }
			});

			assert.strictEqual(mockDb.organisationToContact.deleteMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.organisationToContact.deleteMany.mock.calls[0].arguments[0], {
				where: {
					contactId: 'contact-1',
					Organisation: { S62aToApplicants: { some: { s62aId: 'case-1', roleId: ORGANISATION_ROLES_ID.APPLICANT } } }
				}
			});

			assert.strictEqual(mockDb.contact.delete.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.contact.delete.mock.calls[0].arguments[0], {
				where: { id: 'contact-1' }
			});
		});

		it('logs a warning if contact deletion fails due to being referenced elsewhere', async () => {
			const testError = new Error('Foreign key constraint');
			mockDb.contact.delete = mock.fn(() => Promise.reject(testError));

			await deleter.deleteApplicantContactDetails('case-1', 'contact-1');

			assert.strictEqual(mockDb.contact.delete.mock.callCount(), 1);

			assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
			assert.strictEqual(
				mockLogger.warn.mock.calls[0].arguments[1],
				'Unable to delete Contact record (may still be referenced)'
			);
		});
	});

	describe('deleteAgentContactDetails', () => {
		it('deletes org-to-contact link for agent and attempts to delete contact', async () => {
			await deleter.deleteAgentContactDetails('case-1', 'contact-1');

			assert.strictEqual(mockDb.organisationToContact.deleteMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.organisationToContact.deleteMany.mock.calls[0].arguments[0], {
				where: {
					contactId: 'contact-1',
					Organisation: { S62aToApplicants: { some: { s62aId: 'case-1', roleId: ORGANISATION_ROLES_ID.AGENT } } }
				}
			});

			assert.strictEqual(mockDb.contact.delete.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.contact.delete.mock.calls[0].arguments[0], {
				where: { id: 'contact-1' }
			});
		});

		it('logs a warning if agent contact deletion fails', async () => {
			mockDb.contact.delete = mock.fn(() => Promise.reject(new Error('Constraint')));

			await deleter.deleteAgentContactDetails('case-1', 'contact-1');

			assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
			assert.strictEqual(
				mockLogger.warn.mock.calls[0].arguments[1],
				'Unable to delete Contact record (may still be referenced)'
			);
		});
	});
});

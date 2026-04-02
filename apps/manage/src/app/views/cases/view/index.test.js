import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildDeleteManageListItemOnConfirmRemove } from './index.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('buildDeleteManageListItemOnConfirmRemove', () => {
	it('calls next without deleting when not on remove confirm step', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn() },
			contact: { delete: mock.fn() }
		};
		const logger = mockLogger();
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'add',
				manageListItemId: 'item-1',
				manageListQuestion: 'confirm',
				question: 'manageApplicantDetails'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
		assert.strictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 0);
		assert.strictEqual(db.organisationToContact.deleteMany.mock.callCount(), 0);
		assert.strictEqual(db.contact.delete.mock.callCount(), 0);
	});

	it('sets a success banner message in session when applicant organisation is deleted', async () => {
		const db = {
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn()
			},
			organisationToContact: { deleteMany: mock.fn() },
			organisation: { delete: mock.fn(async () => ({ id: 'org-1' })) },
			contact: { delete: mock.fn() }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'org-1',
				manageListQuestion: 'confirm',
				question: 'check-applicant-details'
			},
			session: {}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 1);
		assert.strictEqual(db.organisation.delete.mock.callCount(), 1);
		assert.strictEqual(req.session.bannerMessage?.['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('sets a success banner message in session when applicant contact is deleted', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 1 })) },
			contact: { delete: mock.fn(async () => ({ id: 'contact-1' })) }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'contact-1',
				manageListQuestion: 'confirm',
				question: 'check-applicant-contact-details'
			},
			session: {}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(req.session.bannerMessage?.['check-applicant-contact-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('sets a success banner message in session when agent contact is deleted', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 1 })) },
			contact: { delete: mock.fn(async () => ({ id: 'contact-2' })) }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'contact-2',
				manageListQuestion: 'confirm',
				question: 'check-agent-contact-details'
			},
			session: {}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(req.session.bannerMessage?.['check-agent-contact-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('calls next without deleting when id is missing', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn() },
			contact: { delete: mock.fn() }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				manageListAction: 'remove',
				manageListItemId: 'item-1',
				manageListQuestion: 'confirm',
				question: 'manageApplicantDetails'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 0);
	});

	it('deletes applicant organisation relation when remove is confirmed for check-applicant-details', async () => {
		const db = {
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn()
			},
			organisationToContact: { deleteMany: mock.fn() },
			contact: { delete: mock.fn() }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'org-1',
				manageListQuestion: 'confirm',
				question: 'check-applicant-details'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 1);
		assert.deepStrictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.calls[0].arguments[0], {
			where: { crownDevelopmentId: 'case-1', organisationId: 'org-1' }
		});
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('deletes applicant contact join rows and then deletes the contact when remove is confirmed', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 2 })) },
			contact: { delete: mock.fn(async () => ({ id: 'contact-1' })) }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'contact-1',
				manageListQuestion: 'confirm',
				question: 'check-applicant-contact-details'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(db.organisationToContact.deleteMany.mock.callCount(), 1);
		assert.deepStrictEqual(db.organisationToContact.deleteMany.mock.calls[0].arguments[0], {
			where: {
				contactId: 'contact-1',
				Organisation: {
					CrownDevelopmentToOrganisation: {
						some: { crownDevelopmentId: 'case-1' }
					}
				}
			}
		});
		assert.strictEqual(db.contact.delete.mock.callCount(), 1);
		assert.deepStrictEqual(db.contact.delete.mock.calls[0].arguments[0], { where: { id: 'contact-1' } });
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('continues when applicant contact deletion fails and logs warning', async () => {
		const logger = mockLogger();
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 1 })) },
			contact: {
				delete: mock.fn(async () => {
					throw new Error('still referenced');
				})
			}
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'contact-1',
				manageListQuestion: 'confirm',
				question: 'check-applicant-contact-details'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(logger.warn.mock.callCount(), 1);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('continues when agent contact deletion fails and logs warning', async () => {
		const logger = mockLogger();
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 1 })) },
			contact: {
				delete: mock.fn(async () => {
					throw new Error('still referenced');
				})
			}
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'contact-2',
				manageListQuestion: 'confirm',
				question: 'check-agent-contact-details'
			},
			session: {}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(logger.warn.mock.callCount(), 1);
		assert.strictEqual(req.session.bannerMessage?.['check-agent-contact-details:item-removed-success'], undefined);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('calls next without deleting when required route params are missing or not strings', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn() },
			contact: { delete: mock.fn() }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 123,
				manageListQuestion: 'confirm'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
		assert.strictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 0);
		assert.strictEqual(db.organisationToContact.deleteMany.mock.callCount(), 0);
		assert.strictEqual(db.contact.delete.mock.callCount(), 0);
	});

	it('deletes agent contact join rows for agent organisation and then deletes the contact', async () => {
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 2 })) },
			contact: { delete: mock.fn(async () => ({ id: 'contact-2' })) }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'contact-2',
				manageListQuestion: 'confirm',
				question: 'check-agent-contact-details'
			},
			res: {
				locals: {
					journeyResponse: {
						answers: {
							agentOrganisationRelationId: 'rel-1'
						}
					}
				}
			}
		};
		const res = req.res;
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(db.organisationToContact.deleteMany.mock.callCount(), 1);
		assert.deepStrictEqual(db.organisationToContact.deleteMany.mock.calls[0].arguments[0], {
			where: {
				contactId: 'contact-2',
				Organisation: {
					CrownDevelopmentToOrganisation: {
						some: { crownDevelopmentId: 'case-1' }
					}
				}
			}
		});
		assert.strictEqual(db.contact.delete.mock.callCount(), 1);
		assert.deepStrictEqual(db.contact.delete.mock.calls[0].arguments[0], { where: { id: 'contact-2' } });
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('calls next without deleting when no handler exists for question', async () => {
		const logger = mockLogger();
		const db = {
			crownDevelopmentToOrganisation: { deleteMany: mock.fn(), findFirst: mock.fn() },
			organisationToContact: { deleteMany: mock.fn() },
			contact: { delete: mock.fn() }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'item-1',
				manageListQuestion: 'confirm',
				question: 'some-unknown-question'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(logger.warn.mock.callCount(), 1);
		assert.strictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 0);
		assert.strictEqual(db.organisationToContact.deleteMany.mock.callCount(), 0);
		assert.strictEqual(db.contact.delete.mock.callCount(), 0);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('passes error to next when delete handler throws', async () => {
		const db = {
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => {
					throw new Error('db failed');
				}),
				findFirst: mock.fn()
			},
			organisationToContact: { deleteMany: mock.fn() },
			contact: { delete: mock.fn() }
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-1',
				manageListAction: 'remove',
				manageListItemId: 'org-1',
				manageListQuestion: 'confirm',
				question: 'check-applicant-details'
			}
		};
		const res = {};
		const next = mock.fn();

		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 1);
		assert.ok(next.mock.calls[0].arguments[0] instanceof Error);
	});
});

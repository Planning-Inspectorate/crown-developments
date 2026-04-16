import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { addSuccessBannerFromMessage, buildDeleteManageListItemOnConfirmRemove } from './delete.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('buildDeleteManageListItemOnConfirmRemove', () => {
	it('should call next without deleting when not on remove confirm step', async () => {
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

	it('should set a success banner message in session when applicant organisation is deleted', async () => {
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn(async () => null)
			},
			organisationToContact: { deleteMany: mock.fn(), findMany: mock.fn(async () => []) },
			organisation: { delete: mock.fn(async () => ({ id: 'org-1' })) },
			contact: { delete: mock.fn() }
		};
		db.$transaction = mock.fn(async (ops) => {
			// prisma allows passing an array of operations; we just execute them in order for this test
			for (const op of ops) await op;
			return [];
		});
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
		assert.strictEqual(db.$transaction.mock.callCount(), 1);
		assert.strictEqual(db.organisationToContact.findMany.mock.callCount(), 1);
		assert.strictEqual(db.organisationToContact.deleteMany.mock.callCount(), 1);
		assert.strictEqual(db.organisation.delete.mock.callCount(), 1);
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should delete applicant organisation relation when remove is confirmed for check-applicant-details', async () => {
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				// Simulate the organisation still being referenced elsewhere, so we only unlink it from this case.
				findFirst: mock.fn(async () => ({ id: 'still-referenced' }))
			}
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
		assert.deepStrictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.calls[0].arguments[0], {
			where: { crownDevelopmentId: { in: ['case-1'] }, organisationId: 'org-1', role: 'applicant' }
		});
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should delete applicant organisation relations across linked cases', async () => {
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async ({ where }) => {
					if (where.id === 'case-child') {
						return { id: 'case-child', linkedParentId: 'case-parent', ChildrenCrownDevelopment: [] };
					}
					if (where.id === 'case-parent') {
						return {
							id: 'case-parent',
							ChildrenCrownDevelopment: [{ id: 'case-child' }, { id: 'case-sibling' }]
						};
					}
					return null;
				})
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 2 })),
				findFirst: mock.fn(async () => ({ id: 'still-referenced' }))
			}
		};
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger: mockLogger() });
		const req = {
			params: {
				id: 'case-child',
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

		assert.deepStrictEqual(db.crownDevelopmentToOrganisation.deleteMany.mock.calls[0].arguments[0], {
			where: {
				crownDevelopmentId: { in: ['case-parent', 'case-child', 'case-sibling'] },
				organisationId: 'org-1',
				role: 'applicant'
			}
		});
		assert.strictEqual(req.session.bannerMessage['case-child']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should set a success banner message in session when applicant contact is deleted', async () => {
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

		assert.strictEqual(
			req.session.bannerMessage['case-1']['check-applicant-contact-details:item-removed-success'],
			true
		);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should set a success banner message in session when agent contact is deleted', async () => {
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

		assert.strictEqual(req.session.bannerMessage['case-1']['check-agent-contact-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should call next without deleting when id is missing', async () => {
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

	it('should call next without deleting when required route params are missing or not strings', async () => {
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

	it('should delete applicant contact join rows and then delete the contact when remove is confirmed', async () => {
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
						some: { crownDevelopmentId: 'case-1', role: 'applicant' }
					}
				}
			}
		});
		assert.strictEqual(db.contact.delete.mock.callCount(), 1);
		assert.deepStrictEqual(db.contact.delete.mock.calls[0].arguments[0], { where: { id: 'contact-1' } });
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should continue when applicant contact deletion fails and logs warning', async () => {
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

	it('should continue when agent contact deletion fails and logs warning', async () => {
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

	it('should delete agent contact join rows for agent organisation and then delete the contact', async () => {
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
						some: { crownDevelopmentId: 'case-1', role: 'agent' }
					}
				}
			}
		});
		assert.strictEqual(db.contact.delete.mock.callCount(), 1);
		assert.deepStrictEqual(db.contact.delete.mock.calls[0].arguments[0], { where: { id: 'contact-2' } });
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should throw error without deleting when no handler exists for question', async () => {
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
		assert.ok(next.mock.calls[0].arguments[0] instanceof Error);
	});

	it('should pass error to next when delete handler throws', async () => {
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
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

	it('should delete linked contacts after deleting an applicant organisation', async () => {
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn(async () => null)
			},
			organisationToContact: {
				deleteMany: mock.fn(async () => ({ count: 2 })),
				findMany: mock.fn(async () => [{ contactId: 'contact-1' }, { contactId: 'contact-2' }])
			},
			organisation: { delete: mock.fn(async () => ({ id: 'org-1' })) },
			contact: { delete: mock.fn(), deleteMany: mock.fn(async () => ({ count: 2 })) }
		};
		db.$transaction = mock.fn(async (ops) => {
			for (const op of ops) await op;
			return [];
		});
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

		assert.strictEqual(db.contact.deleteMany.mock.callCount(), 1);
		assert.deepStrictEqual(db.contact.deleteMany.mock.calls[0].arguments[0], {
			where: { id: { in: ['contact-1', 'contact-2'] }, OrganisationToContact: { none: {} } }
		});
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should not attempt to delete contacts when an applicant organisation has no linked contacts', async () => {
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn(async () => null)
			},
			organisationToContact: { deleteMany: mock.fn(async () => ({ count: 0 })), findMany: mock.fn(async () => []) },
			organisation: { delete: mock.fn(async () => ({ id: 'org-1' })) },
			contact: { delete: mock.fn(), deleteMany: mock.fn() }
		};
		db.$transaction = mock.fn(async (ops) => {
			for (const op of ops) await op;
			return [];
		});
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

		assert.strictEqual(db.contact.deleteMany.mock.callCount(), 0);
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should continue when linked contact cleanup fails after deleting an applicant organisation', async () => {
		const logger = mockLogger();
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn(async () => null)
			},
			organisationToContact: {
				deleteMany: mock.fn(async () => ({ count: 2 })),
				findMany: mock.fn(async () => [{ contactId: 'contact-1' }])
			},
			organisation: { delete: mock.fn(async () => ({ id: 'org-1' })) },
			contact: {
				delete: mock.fn(),
				deleteMany: mock.fn(async () => {
					throw new Error('still referenced');
				})
			}
		};
		db.$transaction = mock.fn(async (ops) => {
			for (const op of ops) await op;
			return [];
		});
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger });
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

		assert.strictEqual(logger.warn.mock.callCount(), 1);
		assert.strictEqual(
			logger.warn.mock.calls[0].arguments[1],
			'Unable to delete contact record linked to organisation.'
		);
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should set the success banner even when Organisation row deletion fails', async () => {
		const logger = mockLogger();
		const db = {
			crownDevelopment: {
				findUnique: mock.fn(async () => ({ id: 'case-1', linkedParentId: null, ChildrenCrownDevelopment: [] }))
			},
			crownDevelopmentToOrganisation: {
				deleteMany: mock.fn(async () => ({ count: 1 })),
				findFirst: mock.fn(async () => null)
			},
			organisationToContact: {
				deleteMany: mock.fn(async () => ({ count: 2 })),
				findMany: mock.fn(async () => [{ contactId: 'contact-1' }, { contactId: 'contact-2' }])
			},
			organisation: { delete: mock.fn(async () => ({ id: 'org-1' })) },
			contact: { delete: mock.fn(), deleteMany: mock.fn(async () => ({ count: 2 })) }
		};
		db.$transaction = mock.fn(async () => {
			throw new Error('org still referenced');
		});
		const middleware = buildDeleteManageListItemOnConfirmRemove({ db, logger });
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

		assert.strictEqual(logger.warn.mock.callCount(), 1);
		assert.strictEqual(
			logger.warn.mock.calls[0].arguments[1],
			'Unable to delete Organisation record (may still be referenced)'
		);
		assert.strictEqual(db.contact.deleteMany.mock.callCount(), 0);
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});
});

describe('addSuccessBannerFromMessage', () => {
	it('should set success banner and clear session key for check-agent-contact-details', () => {
		const req = {
			params: { question: 'check-agent-contact-details', id: 'case-1' },
			session: {
				bannerMessage: {
					'case-1': {
						'check-agent-contact-details:item-removed-success': true
					}
				}
			}
		};
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, 'Contact removed');
		assert.strictEqual(
			req.session.bannerMessage['case-1']['check-agent-contact-details:item-removed-success'],
			undefined
		);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should set success banner and clear session key for check-applicant-contact-details', () => {
		const req = {
			params: { question: 'check-applicant-contact-details', id: 'case-1' },
			session: {
				bannerMessage: {
					'case-1': {
						'check-applicant-contact-details:item-removed-success': true
					}
				}
			}
		};
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, 'Contact removed');
		assert.strictEqual(
			req.session.bannerMessage['case-1']['check-applicant-contact-details:item-removed-success'],
			undefined
		);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should set success banner and clear session key for check-applicant-details', () => {
		const req = {
			params: { question: 'check-applicant-details', id: 'case-1' },
			session: {
				bannerMessage: {
					'case-1': {
						'check-applicant-details:item-removed-success': true
					}
				}
			}
		};
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, 'Organisation removed');
		assert.strictEqual(req.session.bannerMessage['case-1']['check-applicant-details:item-removed-success'], undefined);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should call next when req.params.question is missing', () => {
		const req = { params: {}, session: { bannerMessage: {} } };
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, undefined);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should call next when req.params.question is not a string', () => {
		const req = { params: { question: 123 }, session: { bannerMessage: {} } };
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, undefined);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should call next when question is not configured for a delete success banner', () => {
		const req = {
			params: { question: 'some-other-question' },
			session: {
				bannerMessage: {
					'some-other-question:item-removed-success': true
				}
			}
		};
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, undefined);
		assert.strictEqual(req.session.bannerMessage['some-other-question:item-removed-success'], true);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should call next when session is missing', () => {
		const req = { params: { question: 'check-agent-contact-details' } };
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, undefined);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should do nothing when session exists but banner key is not set', () => {
		const req = {
			params: { question: 'check-agent-contact-details' },
			session: {
				bannerMessage: {}
			}
		};
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(req, res, next);

		assert.strictEqual(res.locals.notificationBannerSuccess, undefined);
		assert.deepStrictEqual(req.session.bannerMessage, {});
		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 0);
	});

	it('should pass error to next when middleware throws', () => {
		const res = { locals: {} };
		const next = mock.fn();

		addSuccessBannerFromMessage(undefined, res, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(next.mock.calls[0].arguments.length, 1);
		assert.ok(next.mock.calls[0].arguments[0] instanceof Error);
	});
});

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	publishCrownCase,
	fetchCrownPublishCase,
	answerValidation,
	unpublishCrownCase,
	fetchCrownUnpublishCase,
	createPublishAuditHook,
	createUnpublishAuditHook,
	type FetchedCrownDevelopment
} from './publish.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

describe('Crown Development Publish & Unpublish Domain Helpers', () => {
	describe('publishCrownCase', () => {
		it('should call db.crownDevelopment.update setting publishDate to current date', async (context) => {
			const fakeNow = new Date('2026-09-17T12:00:00.000Z');
			context.mock.timers.enable({ apis: ['Date'], now: fakeNow });

			const mockDb = {
				crownDevelopment: {
					update: mock.fn(() => Promise.resolve())
				}
			};

			await publishCrownCase(mockDb as any, 'crown-123');

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.update.mock.calls[0].arguments[0], {
				where: { id: 'crown-123' },
				data: {
					publishDate: fakeNow
				}
			});
		});
	});

	describe('fetchCrownPublishCase', () => {
		it('should call db.crownDevelopment.findUnique with correct relation includes', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => Promise.resolve({ id: 'crown-123' }))
				}
			};

			const result = await fetchCrownPublishCase(mockDb as any, 'crown-123');

			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.findUnique.mock.calls[0].arguments[0], {
				where: { id: 'crown-123' },
				include: {
					Lpa: { include: { Address: true } },
					SiteAddress: true
				}
			});
			assert.deepStrictEqual(result, { id: 'crown-123' });
		});
	});

	describe('answerValidation', () => {
		const createValidCrownCase = (): NonNullable<FetchedCrownDevelopment> =>
			({
				id: 'crown-123',
				description: 'A valid development proposal description',
				typeId: 'type-app-1',
				siteEasting: 500000,
				siteNorthing: 200000,
				Lpa: { id: 'lpa-org-1', name: 'Local LPA', Address: null },
				SiteAddress: { postcode: 'SW1A 1AA' }
			}) as any;

		it('should return all valid rule values when case contains all required fields', () => {
			const validCase = createValidCrownCase();
			const results = answerValidation(validCase, 'crown-123');

			assert.strictEqual(results.length, 4);
			assert.strictEqual(results[0].value, 'A valid development proposal description');
			assert.strictEqual(results[1].value, 'type-app-1');
			assert.strictEqual(results[2].value, 'lpa-org-1');
			assert.ok(results[3].value);
		});

		it('should fail description check when development description is missing', () => {
			const invalidCase = createValidCrownCase();
			invalidCase.description = null as any;

			const results = answerValidation(invalidCase, 'crown-123');

			assert.strictEqual(Boolean(results[0].value), false);
			assert.strictEqual(results[0].errorMessage, 'Enter Development Description');
			assert.strictEqual(results[0].pageLink, '/cases/crown-123/overview/development-description');
		});

		it('should fail application type check when typeId is missing', () => {
			const invalidCase = createValidCrownCase();
			invalidCase.typeId = null as any;

			const results = answerValidation(invalidCase, 'crown-123');

			assert.strictEqual(Boolean(results[1].value), false);
			assert.strictEqual(results[1].errorMessage, 'Enter Application Type');
			assert.strictEqual(results[1].pageLink, '/cases/crown-123/overview/type-of-application');
		});

		it('should fail LPA check when LPA or LPA ID is missing', () => {
			const invalidCase = createValidCrownCase();
			invalidCase.Lpa = null as any;

			const results = answerValidation(invalidCase, 'crown-123');

			assert.strictEqual(Boolean(results[2].value), false);
			assert.strictEqual(results[2].errorMessage, 'Enter local planning authority');
			assert.strictEqual(results[2].pageLink, '/cases/crown-123/overview/local-planning-authority');
		});

		it('should pass site address check if postcode is missing but easting and northing are present', () => {
			const coordsOnlyCase = createValidCrownCase();
			coordsOnlyCase.SiteAddress = null as any;
			coordsOnlyCase.siteEasting = 123456 as any;
			coordsOnlyCase.siteNorthing = 654321 as any;

			const results = answerValidation(coordsOnlyCase, 'crown-123');

			assert.ok(results[3].value);
		});

		it('should fail site address check when neither postcode nor coordinates exist', () => {
			const invalidCase = createValidCrownCase();
			invalidCase.SiteAddress = null as any;
			invalidCase.siteEasting = null as any;
			invalidCase.siteNorthing = null as any;

			const results = answerValidation(invalidCase, 'crown-123');

			assert.strictEqual(Boolean(results[3].value), false);
			assert.strictEqual(
				results[3].errorMessage,
				'You must enter site coordinates or postcode within the site address'
			);
			assert.strictEqual(results[3].pageLink, '/cases/crown-123#overview');
		});
	});

	describe('unpublishCrownCase', () => {
		it('should call db.crownDevelopment.update setting publishDate to null', async () => {
			const mockDb = {
				crownDevelopment: {
					update: mock.fn(() => Promise.resolve())
				}
			};

			await unpublishCrownCase(mockDb as any, 'crown-123');

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.update.mock.calls[0].arguments[0], {
				where: { id: 'crown-123' },
				data: {
					publishDate: null
				}
			});
		});
	});

	describe('fetchCrownUnpublishCase', () => {
		it('should call db.crownDevelopment.findUnique with target id', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => Promise.resolve({ id: 'crown-123' }))
				}
			};

			const result = await fetchCrownUnpublishCase(mockDb as any, 'crown-123');

			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.findUnique.mock.calls[0].arguments[0], {
				where: { id: 'crown-123' }
			});
			assert.deepStrictEqual(result, { id: 'crown-123' });
		});
	});

	describe('Audit Hooks', () => {
		describe('createPublishAuditHook', () => {
			it('should create a hook that accepts request and caseId', async () => {
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn() },
					audit: { recordMany: mock.fn() },
					isAuditLive: true
				};

				const publishHook = createPublishAuditHook(mockService as any, 'CRN/2026/001');

				// Hook should be a function
				assert.strictEqual(typeof publishHook, 'function');

				// Hook should execute without throwing
				await publishHook({ session: { account: { localAccountId: 'user-123' } } } as any, 'crown-case-1');
			});

			it('should record CASE_PUBLISHED audit event via recordMany with correct arguments', async () => {
				const mockRecordMany = mock.fn();
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn(), error: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: true
				};

				const publishHook = createPublishAuditHook(mockService as any, 'CRN/2026/001');
				const req = { session: { account: { localAccountId: 'user-123' } } } as any;
				await publishHook(req, 'crown-case-1');

				// Assert recordMany was called once
				assert.strictEqual(mockRecordMany.mock.callCount(), 1);

				// Assert correct arguments to recordMany
				const [entries, dataModel] = mockRecordMany.mock.calls[0].arguments;
				assert.strictEqual(dataModel, CASE_DATA_MODEL.CROWN);
				assert.strictEqual(entries.length, 1);
				assert.strictEqual(entries[0].caseId, 'crown-case-1');
				assert.strictEqual(entries[0].userId, 'user-123');
				assert.strictEqual(entries[0].action, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED);
				assert.deepStrictEqual(entries[0].metadata, { reference: 'CRN/2026/001' });
			});

			it('should not record audit when isAuditLive is false', async () => {
				const mockRecordMany = mock.fn();
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: false
				};

				const publishHook = createPublishAuditHook(mockService as any, 'CRN/2026/002');
				await publishHook({ session: { account: { localAccountId: 'user-123' } } } as any, 'crown-case-2');

				// recordMany should not be called
				assert.strictEqual(mockRecordMany.mock.callCount(), 0);
				// Instead, an info log should be made
				assert.strictEqual(mockService.logger.info.mock.callCount(), 1);
			});

			it('should not throw when called with missing session data', async () => {
				const mockRecordMany = mock.fn();
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn(), error: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: true
				};

				const publishHook = createPublishAuditHook(mockService as any, 'CRN/2026/003');
				await publishHook({ session: { account: {} } } as any, 'crown-case-3');

				assert.strictEqual(mockRecordMany.mock.callCount(), 1);
				const [entries] = mockRecordMany.mock.calls[0].arguments;
				assert.strictEqual(entries[0].userId, 'Unknown-user');
			});

			it('should not throw when recordMany throws', async () => {
				const mockRecordMany = mock.fn(async () => {
					throw new Error('Audit service failed');
				});
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn(), error: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: true
				};

				const publishHook = createPublishAuditHook(mockService as any, 'CRN/2026/004');

				// Should not throw
				await publishHook({ session: { account: { localAccountId: 'user-123' } } } as any, 'crown-case-4');

				assert.strictEqual(mockRecordMany.mock.callCount(), 1);
			});
		});

		describe('createUnpublishAuditHook', () => {
			it('should record CASE_UNPUBLISHED audit event via recordMany with correct arguments', async () => {
				const mockRecordMany = mock.fn();
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn(), error: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: true
				};

				const unpublishHook = createUnpublishAuditHook(mockService as any, 'CRN/2026/005');
				const req = { session: { account: { localAccountId: 'user-456' } } } as any;
				await unpublishHook(req, 'crown-case-5');

				assert.strictEqual(mockRecordMany.mock.callCount(), 1);
				const [entries, dataModel] = mockRecordMany.mock.calls[0].arguments;
				assert.strictEqual(dataModel, CASE_DATA_MODEL.CROWN);
				assert.strictEqual(entries[0].action, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED);
				assert.deepStrictEqual(entries[0].metadata, { reference: 'CRN/2026/005' });
			});

			it('should not record audit when isAuditLive is false', async () => {
				const mockRecordMany = mock.fn();
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: false
				};

				const unpublishHook = createUnpublishAuditHook(mockService as any, 'CRN/2026/006');
				await unpublishHook({ session: { account: { localAccountId: 'user-456' } } } as any, 'crown-case-6');

				assert.strictEqual(mockRecordMany.mock.callCount(), 0);
				assert.strictEqual(mockService.logger.info.mock.callCount(), 1);
			});

			it('should not throw when called with missing session data', async () => {
				const mockRecordMany = mock.fn();
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn(), error: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: true
				};

				const unpublishHook = createUnpublishAuditHook(mockService as any, 'CRN/2026/007');
				await unpublishHook({ session: { account: {} } } as any, 'crown-case-7');

				assert.strictEqual(mockRecordMany.mock.callCount(), 1);
			});

			it('should not throw when recordMany throws', async () => {
				const mockRecordMany = mock.fn(async () => {
					throw new Error('Audit service failed');
				});
				const mockService = {
					logger: { warn: mock.fn(), info: mock.fn(), error: mock.fn() },
					audit: { recordMany: mockRecordMany },
					isAuditLive: true
				};

				const unpublishHook = createUnpublishAuditHook(mockService as any, 'CRN/2026/008');
				await unpublishHook({ session: { account: { localAccountId: 'user-456' } } } as any, 'crown-case-8');

				assert.strictEqual(mockRecordMany.mock.callCount(), 1);
			});
		});
	});
});

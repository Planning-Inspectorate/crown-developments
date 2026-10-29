import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	publishCrownCase,
	fetchCrownPublishCase,
	answerValidation,
	unpublishCrownCase,
	fetchCrownUnpublishCase,
	type FetchedCrownDevelopment
} from './publish.ts';

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
});

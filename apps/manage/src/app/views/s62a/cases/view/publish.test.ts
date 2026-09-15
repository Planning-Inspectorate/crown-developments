import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	publishS62aCase,
	fetchS62aPublishCase,
	answerValidation,
	unpublishS62aCase,
	fetchS62aUnpublishCase,
	type FetchedS62aCase
} from './publish.ts';

describe('S62A Publish & Unpublish Domain Helpers', () => {
	describe('publishS62aCase', () => {
		it('should call db.s62aCase.update with publish date set to current date', async (context) => {
			const fakeNow = new Date('2026-09-17T12:00:00.000Z');
			context.mock.timers.enable({ apis: ['Date'], now: fakeNow });

			const mockDb = {
				s62aCase: {
					update: mock.fn(() => Promise.resolve())
				}
			};

			await publishS62aCase(mockDb as any, 'case-123');

			assert.strictEqual(mockDb.s62aCase.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aCase.update.mock.calls[0].arguments[0], {
				where: { id: 'case-123' },
				data: {
					S62aDates: {
						update: { publishDate: fakeNow }
					}
				}
			});
		});
	});

	describe('fetchS62aPublishCase', () => {
		it('should call db.s62aCase.findUnique with all required relation includes', async () => {
			const mockDb = {
				s62aCase: {
					findUnique: mock.fn(() => Promise.resolve({ id: 'case-123' }))
				}
			};

			const result = await fetchS62aPublishCase(mockDb as any, 'case-123');

			assert.strictEqual(mockDb.s62aCase.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aCase.findUnique.mock.calls[0].arguments[0], {
				where: { id: 'case-123' },
				include: {
					Lpa: { include: { Address: true } },
					SiteAddress: true,
					S62aDates: true,
					S62aToApplicants: {
						include: {
							Organisation: true,
							Contact: true
						}
					}
				}
			});
			assert.deepStrictEqual(result, { id: 'case-123' });
		});
	});

	describe('answerValidation', () => {
		const createValidCase = (): NonNullable<FetchedS62aCase> =>
			({
				id: 'case-123',
				siteEasting: 123456,
				siteNorthing: 654321,
				S62aDates: { applicationValidDate: new Date('2026-01-01') },
				SiteAddress: { postcode: 'SW1A 1AA' },
				S62aToApplicants: [
					{
						contactId: 'contact-1',
						Contact: { firstName: 'Jane', lastName: 'Doe' },
						organisationId: 'org-1',
						Organisation: { name: 'Acme Ltd' }
					}
				]
			}) as any;

		it('should return all valid rule values when case has all required fields', () => {
			const validCase = createValidCase();
			const results = answerValidation(validCase, 'case-123');

			assert.strictEqual(results.length, 4);
			assert.ok(results[0].value);
			assert.ok(results[1].value);
			assert.strictEqual(results[2].value, true);
			assert.strictEqual(results[3].value, true);
		});

		it('should fail application valid date check when date is missing', () => {
			const invalidCase = createValidCase();
			invalidCase.S62aDates = null as any;

			const results = answerValidation(invalidCase, 'case-123');

			assert.strictEqual(Boolean(results[0].value), false);
			assert.strictEqual(results[0].errorMessage, 'You must enter the date the application was confirmed as valid');
			assert.strictEqual(results[0].pageLink, '/s62a/cases/case-123/dates');
		});

		it('should pass site location check if postcode is missing but easting and northing are present', () => {
			const caseWithCoordsOnly = createValidCase();
			caseWithCoordsOnly.SiteAddress = null as any;
			caseWithCoordsOnly.siteEasting = 100000 as any;
			caseWithCoordsOnly.siteNorthing = 200000 as any;

			const results = answerValidation(caseWithCoordsOnly, 'case-123');

			assert.ok(results[1].value);
		});

		it('should fail site location check when neither postcode nor coordinates exist', () => {
			const invalidCase = createValidCase();
			invalidCase.SiteAddress = null as any;
			invalidCase.siteEasting = null as any;
			invalidCase.siteNorthing = null as any;

			const results = answerValidation(invalidCase, 'case-123');

			assert.strictEqual(Boolean(results[1].value), false);
			assert.strictEqual(
				results[1].errorMessage,
				'You must enter site coordinates or postcode within the site address'
			);
		});

		it('should fail applicant contact name check when contact firstName or lastName is missing', () => {
			const invalidCase = createValidCase();
			invalidCase.S62aToApplicants = [
				{
					contactId: 'contact-1',
					Contact: { firstName: 'Jane', lastName: '' }, // Missing last name
					organisationId: null,
					Organisation: null
				}
			] as any;

			const results = answerValidation(invalidCase, 'case-123');

			assert.strictEqual(results[2].value, false);
			assert.strictEqual(results[2].errorMessage, 'You must enter the individual applicant contact name');
		});

		it('should fail applicant organisation check when organisation name is missing', () => {
			const invalidCase = createValidCase();
			invalidCase.S62aToApplicants = [
				{
					contactId: null,
					Contact: null,
					organisationId: 'org-1',
					Organisation: { name: '' } // Missing org name
				}
			] as any;

			const results = answerValidation(invalidCase, 'case-123');

			assert.strictEqual(results[3].value, false);
			assert.strictEqual(results[3].errorMessage, 'You must enter the applicant organisation name');
		});
	});

	describe('unpublishS62aCase', () => {
		it('should call db.s62aCase.update with publishDate set to null', async () => {
			const mockDb = {
				s62aCase: {
					update: mock.fn(() => Promise.resolve())
				}
			};

			await unpublishS62aCase(mockDb as any, 'case-123');

			assert.strictEqual(mockDb.s62aCase.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aCase.update.mock.calls[0].arguments[0], {
				where: { id: 'case-123' },
				data: {
					S62aDates: {
						update: { publishDate: null }
					}
				}
			});
		});
	});

	describe('fetchS62aUnpublishCase', () => {
		it('should call db.s62aCase.findUnique with target id', async () => {
			const mockDb = {
				s62aCase: {
					findUnique: mock.fn(() => Promise.resolve({ id: 'case-123' }))
				}
			};

			const result = await fetchS62aUnpublishCase(mockDb as any, 'case-123');

			assert.strictEqual(mockDb.s62aCase.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aCase.findUnique.mock.calls[0].arguments[0], {
				where: { id: 'case-123' }
			});
			assert.deepStrictEqual(result, { id: 'case-123' });
		});
	});
});

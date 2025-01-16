import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildListCases, crownDevelopmentToViewModel } from './controller.js';
import { configureNunjucks } from '../../../nunjucks.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('case list', () => {
	describe('crownDevelopmentToViewModel', () => {
		it('should map relations if they exist', () => {
			/** @type {import('./types.js').CrownDevelopmentListFields} */
			const input = {
				id: 'id-1',
				reference: 'case/ref',
				Lpa: { name: 'LPA 1' },
				Status: { displayName: 'New' },
				Type: { displayName: 'Planning permission' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaName, 'LPA 1');
			assert.strictEqual(result.status, 'New');
			assert.strictEqual(result.type, 'Planning permission');
		});
		it(`should ignore relations that don't exist`, () => {
			/** @type {import('./types.js').CrownDevelopmentListFields} */
			const input = {
				id: 'id-1',
				reference: 'case/ref',
				Lpa: { name: 'LPA 1' },
				Type: { displayName: 'Planning permission' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaName, 'LPA 1');
			assert.strictEqual(result.status, undefined);
			assert.strictEqual(result.type, 'Planning permission');
		});
		it(`should use site address postcode as location`, () => {
			/** @type {import('./types.js').CrownDevelopmentListFields} */
			const input = {
				id: 'id-1',
				reference: 'case/ref',
				SiteAddress: { id: 'address-id-1', postcode: 'B11 ABC' },
				siteNorthing: 12435,
				siteEasting: 12435
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.location, 'B11 ABC');
		});
		it(`should use all site address fields as location`, () => {
			/** @type {import('./types.js').CrownDevelopmentListFields} */
			const input = {
				id: 'id-1',
				reference: 'case/ref',
				SiteAddress: {
					id: 'address-id-1',
					line1: 'House',
					line2: 'Street',
					townCity: 'Town',
					county: 'County',
					postcode: 'B11 ABC'
				},
				siteNorthing: 12435,
				siteEasting: 12435
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.location, 'House, Street, Town, County, B11 ABC');
		});
		it(`should use northing/easting as location if no address`, () => {
			/** @type {import('./types.js').CrownDevelopmentListFields} */
			const input = {
				id: 'id-1',
				reference: 'case/ref',
				siteNorthing: 12435,
				siteEasting: 54321
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.location.includes(`Northing`), true);
			assert.strictEqual(result.location.includes(`Easting`), true);
			assert.strictEqual(result.location.includes('12435'), true);
			assert.strictEqual(result.location.includes('54321'), true);
		});
		it(`should use - as placeholder for easting/northing if not provided`, () => {
			/** @type {import('./types.js').CrownDevelopmentListFields} */
			const input = {
				id: 'id-1',
				reference: 'case/ref',
				siteEasting: 54321
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.location.includes(`Northing: -`), true);
			assert.strictEqual(result.location.includes(`Easting`), true);
			assert.strictEqual(result.location.includes('54321'), true);
		});
	});

	describe('list cases', () => {
		it('should render without error', async () => {
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockDb = {
				crownDevelopment: {
					findMany: mock.fn(() => [{ id: 'id-1' }, { id: 'id-2' }])
				}
			};
			const listCases = buildListCases({ db: mockDb, logger: mockLogger() });
			await assert.doesNotReject(() => listCases({}, mockRes));
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].crownDevelopments?.length, 2);
		});
	});
});

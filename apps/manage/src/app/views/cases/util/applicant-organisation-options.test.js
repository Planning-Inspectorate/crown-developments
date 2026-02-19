import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getApplicantOrganisationOptions } from './applicant-organisation-options.js';

describe('getApplicantOrganisationOptions', () => {
	it('returns empty array if input is not an array', () => {
		assert.deepStrictEqual(getApplicantOrganisationOptions(undefined), []);
		assert.deepStrictEqual(getApplicantOrganisationOptions(null), []);
		assert.deepStrictEqual(getApplicantOrganisationOptions({}), []);
	});

	it('returns empty array if input array is empty', () => {
		assert.deepStrictEqual(getApplicantOrganisationOptions([]), []);
	});

	it('returns correct options for valid organisations', () => {
		const input = [
			{ id: '1', organisationName: 'alpha' },
			{ id: '2', organisationName: 'beta' }
		];
		const result = getApplicantOrganisationOptions(input);
		assert.deepStrictEqual(result, [
			{ text: 'Alpha', value: '1' },
			{ text: 'Beta', value: '2' }
		]);
	});

	it('filters out organisations with missing id or name', () => {
		const input = [
			{ id: '1', organisationName: 'alpha' },
			{ id: '', organisationName: 'beta' },
			{ id: '3', organisationName: '' },
			{ organisationName: 'gamma' },
			{ id: '4' }
		];
		const result = getApplicantOrganisationOptions(input);
		assert.deepStrictEqual(result, [{ text: 'Alpha', value: '1' }]);
	});

	it('applies sentence case to organisationName', () => {
		const input = [
			{ id: '1', organisationName: 'ALPHA Company' },
			{ id: '2', organisationName: 'beta company' }
		];
		const result = getApplicantOrganisationOptions(input);
		assert.deepStrictEqual(result, [
			{ text: 'ALPHA Company', value: '1' },
			{ text: 'Beta company', value: '2' }
		]);
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { S62A_GROUPED_FIELDS, resolveGroupedFieldChanges } from './grouped-fields.ts';

describe('S62A_GROUPED_FIELDS', () => {
	it('should format site coordinates', () => {
		assert.strictEqual(
			S62A_GROUPED_FIELDS.siteCoordinates.format({ siteEasting: 344455, siteNorthing: 555534 }),
			'Easting: 344455, Northing: 555534'
		);
	});

	it('should format site area in the unit it was entered in', () => {
		assert.strictEqual(S62A_GROUPED_FIELDS.siteArea.format({ siteAreaHectares: '10.40' }), '10.4 ha');
		assert.strictEqual(S62A_GROUPED_FIELDS.siteArea.format({ siteAreaSquareMetres: 5000 }), '5000 m²');
		assert.strictEqual(S62A_GROUPED_FIELDS.siteArea.format({ siteAreaHectares: '', siteAreaSquareMetres: '' }), '-');
	});

	it('should format hearing duration in days, leaving out empty parts', () => {
		assert.strictEqual(
			S62A_GROUPED_FIELDS.hearingDuration.format({ prepDuration: 1, sittingDuration: '2.5', reportingDuration: '' }),
			'Prep: 1 day, Sitting: 2.5 days'
		);
	});

	it('should format an LPA contact as name, email and phone number', () => {
		assert.strictEqual(
			S62A_GROUPED_FIELDS.lpaContactDetails.format({
				lpaFirstName: 'Test',
				lpaLastName: 'User One',
				lpaEmailAddress: 'one@example.com'
			}),
			'Test User One, one@example.com'
		);
	});

	it('should format the secondary LPA contact from its own fields', () => {
		assert.strictEqual(
			S62A_GROUPED_FIELDS.secondaryLpaContactDetails.format({
				lpaFirstName: 'Not This One',
				secondaryLpaFirstName: 'Test',
				secondaryLpaLastName: 'User Two',
				secondaryLpaPhoneNumber: '01234567890'
			}),
			'Test User Two, 01234567890'
		);
	});
});

describe('resolveGroupedFieldChanges', () => {
	it('should return one change for the question, not one per input', () => {
		const changes = resolveGroupedFieldChanges(
			['siteEasting', 'siteNorthing'],
			{ siteEasting: 344455, siteNorthing: 555534 },
			{ siteEasting: '344454', siteNorthing: '555534' }
		);

		assert.deepStrictEqual(changes, [
			{
				fieldName: 'siteCoordinates',
				oldValue: 'Easting: 344455, Northing: 555534',
				newValue: 'Easting: 344454, Northing: 555534'
			}
		]);
	});

	it('should treat the view model numbers and form strings as equal', () => {
		const changes = resolveGroupedFieldChanges(
			['siteEasting', 'siteNorthing'],
			{ siteEasting: 344455, siteNorthing: 555534 },
			{ siteEasting: '344455', siteNorthing: '555534' }
		);

		assert.deepStrictEqual(changes, []);
	});

	it('should record a change of site area unit', () => {
		const changes = resolveGroupedFieldChanges(
			['siteAreaHectares', 'siteAreaSquareMetres'],
			{ siteAreaHectares: 1 },
			{ siteAreaHectares: '', siteAreaSquareMetres: '10000' }
		);

		assert.deepStrictEqual(changes, [{ fieldName: 'siteArea', oldValue: '1 ha', newValue: '10000 m²' }]);
	});

	it('should show a cleared group as "-"', () => {
		const changes = resolveGroupedFieldChanges(
			['prepDuration', 'sittingDuration', 'reportingDuration'],
			{ prepDuration: 1 },
			{ prepDuration: null, sittingDuration: null, reportingDuration: null }
		);

		assert.deepStrictEqual(changes, [{ fieldName: 'hearingDuration', oldValue: 'Prep: 1 day', newValue: '-' }]);
	});

	it('should keep the old value for parts that were not sent', () => {
		const changes = resolveGroupedFieldChanges(
			['lpaEmailAddress'],
			{ lpaFirstName: 'Test', lpaLastName: 'User One', lpaEmailAddress: 'one@example.com' },
			{ lpaEmailAddress: 'two@example.com' }
		);

		assert.deepStrictEqual(changes, [
			{
				fieldName: 'lpaContactDetails',
				oldValue: 'Test User One, one@example.com',
				newValue: 'Test User One, two@example.com'
			}
		]);
	});

	it('should ignore saves that do not touch a group', () => {
		assert.deepStrictEqual(resolveGroupedFieldChanges(['lpaReference'], {}, { lpaReference: 'ABC/123' }), []);
	});
});

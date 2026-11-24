import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroupedFieldChanges } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_GROUPED_FIELDS } from './grouped-fields.ts';
import { formatSiteVisit } from '@pins/crowndev-lib/util/audit-formatters.ts';

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

	it('should keep the leading zero on phone numbers', () => {
		assert.strictEqual(
			S62A_GROUPED_FIELDS.lpaContactDetails.format({ lpaFirstName: 'Test', lpaPhoneNumber: '01234567890' }),
			'Test, 01234567890'
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

describe('S62A_GROUPED_FIELDS with resolveGroupedFieldChanges', () => {
	it('should return one change for the question, not one per input', () => {
		const changes = resolveGroupedFieldChanges(
			S62A_GROUPED_FIELDS,
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
			S62A_GROUPED_FIELDS,
			['siteEasting', 'siteNorthing'],
			{ siteEasting: 344455, siteNorthing: 555534 },
			{ siteEasting: '344455', siteNorthing: '555534' }
		);

		assert.deepStrictEqual(changes, []);
	});

	it('should record a change of site area unit', () => {
		const changes = resolveGroupedFieldChanges(
			S62A_GROUPED_FIELDS,
			['siteAreaHectares', 'siteAreaSquareMetres'],
			{ siteAreaHectares: 1 },
			{ siteAreaHectares: '', siteAreaSquareMetres: '10000' }
		);

		assert.deepStrictEqual(changes, [{ fieldName: 'siteArea', oldValue: '1 ha', newValue: '10000 m²' }]);
	});

	it('should show a cleared group as "-"', () => {
		const changes = resolveGroupedFieldChanges(
			S62A_GROUPED_FIELDS,
			['prepDuration', 'sittingDuration', 'reportingDuration'],
			{ prepDuration: 1 },
			{ prepDuration: null, sittingDuration: null, reportingDuration: null }
		);

		assert.deepStrictEqual(changes, [{ fieldName: 'hearingDuration', oldValue: 'Prep: 1 day', newValue: '-' }]);
	});

	it('should keep the old value for parts that were not sent', () => {
		const changes = resolveGroupedFieldChanges(
			S62A_GROUPED_FIELDS,
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
		assert.deepStrictEqual(
			resolveGroupedFieldChanges(S62A_GROUPED_FIELDS, ['lpaReference'], {}, { lpaReference: 'ABC/123' }),
			[]
		);
	});
});

describe('site visit', () => {
	const date = new Date('2027-03-27T00:00:00Z');
	const start = new Date('2027-03-27T10:00:00Z');
	const end = new Date('2027-03-27T12:30:00Z');

	it('should show the date and times for an access required site visit', () => {
		assert.equal(formatSiteVisit(date, start, end), '27 March 2027, 10:00am to 12:30pm');
	});

	it('should show the times in UK time during British Summer Time', () => {
		assert.equal(
			formatSiteVisit(
				new Date('2027-06-30T23:00:00Z'),
				new Date('2027-07-01T09:00:00Z'),
				new Date('2027-07-01T11:30:00Z')
			),
			'1 July 2027, 10:00am to 12:30pm'
		);
	});

	it('should show the date only when there are no times', () => {
		assert.equal(formatSiteVisit(date, null, null), '27 March 2027');
	});

	it('should show a dash when there is no date', () => {
		assert.equal(formatSiteVisit(null, null, null), '-');
	});

	it('should audit a change to the date and times as one entry', () => {
		const changes = resolveGroupedFieldChanges(
			S62A_GROUPED_FIELDS,
			['siteVisitDate', 'siteVisitStartTime', 'siteVisitEndTime'],
			{},
			{ siteVisitDate: date, siteVisitStartTime: start, siteVisitEndTime: end }
		);
		assert.deepEqual(changes, [
			{ fieldName: 'siteVisitDate', oldValue: '-', newValue: '27 March 2027, 10:00am to 12:30pm' }
		]);
	});

	it('should audit a change to one time as an update to the site visit', () => {
		const changes = resolveGroupedFieldChanges(
			S62A_GROUPED_FIELDS,
			['siteVisitDate', 'siteVisitStartTime', 'siteVisitEndTime'],
			{ siteVisitDate: date, siteVisitStartTime: start, siteVisitEndTime: end },
			{ siteVisitDate: date, siteVisitStartTime: start, siteVisitEndTime: new Date('2027-03-27T14:00:00Z') }
		);
		assert.deepEqual(changes, [
			{
				fieldName: 'siteVisitDate',
				oldValue: '27 March 2027, 10:00am to 12:30pm',
				newValue: '27 March 2027, 10:00am to 2:00pm'
			}
		]);
	});
});

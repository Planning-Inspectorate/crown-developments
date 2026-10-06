import assert from 'assert';
import { describe, it } from 'node:test';
import {
	getAboutThisApplicationSectionItems,
	getKeyDatesSectionItems,
	getHearingSectionItems,
	getDecisionSectionItems
} from './section-items.ts';
import type { S62aCaseView } from './view-model.ts';

describe('getAboutThisApplicationSectionItems', () => {
	it('should return the mandatory items with default fallbacks when conditional fields are missing', () => {
		const minimalFields = {
			applicants: ['John Doe']
		} as unknown as S62aCaseView;

		const result = getAboutThisApplicationSectionItems(minimalFields);

		assert.strictEqual(result.length, 5);

		assert.deepStrictEqual(result[0], {
			key: { text: 'Application type' },
			value: { text: '' }
		});

		assert.deepStrictEqual(result[1], {
			key: { text: 'Local planning authority' },
			value: { text: '' }
		});

		assert.deepStrictEqual(result[2], {
			key: { text: 'Applicant' },
			value: { html: '<p class="govuk-body">John Doe</p>' }
		});

		assert.deepStrictEqual(result[3], {
			key: { text: 'Description of the proposed development' },
			value: { text: '' }
		});

		assert.deepStrictEqual(result[4], {
			key: { text: 'Case officer' },
			value: { text: 'Section 62A Applications Team' }
		});
	});

	it('should correctly format plural applicants when more than one applicant is present', () => {
		const fieldsWithMultipleApplicants = {
			applicants: ['Jane Doe', 'Acme Corp']
		} as unknown as S62aCaseView;

		const result = getAboutThisApplicationSectionItems(fieldsWithMultipleApplicants);
		const applicantItem = result[2];

		assert.strictEqual(applicantItem.key.text, 'Applicants');
		assert.strictEqual(
			(applicantItem.value as { html: string }).html,
			'<p class="govuk-body">Jane Doe</p><p class="govuk-body">Acme Corp</p>'
		);
	});

	it('should include conditional items when their corresponding fields are provided', () => {
		const fullyPopulatedFields: S62aCaseView = {
			id: 'test-id',
			reference: 'REF',
			applicationType: 'Major',
			lpaName: 'Primary Test LPA',
			secondaryLpaName: 'Secondary Test LPA',
			applicants: ['Test Applicant'],
			siteAddress: '123 Fake Street, Bristol, BS1',
			siteCoordinates: { easting: '123456', northing: '654321' },
			description: 'A test development',
			procedure: 'Hearing',
			showHearing: false,
			showDecision: false
		};

		const result = getAboutThisApplicationSectionItems(fullyPopulatedFields);

		assert.strictEqual(result.length, 9);

		const secondaryLpaItem = result.find((item) => item.key.text === 'Secondary local planning authority');
		assert.deepStrictEqual(secondaryLpaItem, {
			key: { text: 'Secondary local planning authority' },
			value: { text: 'Secondary Test LPA' }
		});

		const siteAddressItem = result.find((item) => item.key.text === 'Site address');
		assert.deepStrictEqual(siteAddressItem, {
			key: { text: 'Site address' },
			value: { text: '123 Fake Street, Bristol, BS1' }
		});

		const coordinatesItem = result.find((item) => item.key.text === 'Coordinates');
		assert.deepStrictEqual(coordinatesItem, {
			key: { text: 'Coordinates' },
			value: { html: '<p class="govuk-body">Easting: 123456</p><p class="govuk-body">Northing: 654321</p>' }
		});

		const procedureItem = result.find((item) => item.key.text === 'Procedure');
		assert.deepStrictEqual(procedureItem, {
			key: { text: 'Procedure' },
			value: { text: 'Hearing' }
		});
	});

	it('should not include coordinates if either easting or northing is missing', () => {
		const partialCoordinatesFields = {
			applicants: ['John Doe'],
			siteCoordinates: { easting: '123456', northing: '' }
		} as unknown as S62aCaseView;

		const result = getAboutThisApplicationSectionItems(partialCoordinatesFields);

		const coordinatesItem = result.find((item) => item.key.text === 'Coordinates');
		assert.strictEqual(coordinatesItem, undefined);
	});
});

describe('getKeyDatesSectionItems', () => {
	it('should return only the application valid item with an empty string when no dates are provided', () => {
		const minimalFields = {} as unknown as S62aCaseView;
		const result = getKeyDatesSectionItems(minimalFields);

		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Application valid' },
			value: { text: '' }
		});
	});

	it('should include all conditional date items when fully populated fields are provided', () => {
		const fullyPopulatedFields = {
			applicationValidDate: '1 January 2024',
			representationPeriodStartDateTime: '2 January 2024',
			representationPeriodEndDateTime: '16 January 2024',
			targetDecisionDate: '1 March 2024',
			decisionDate: '28 February 2024',
			withdrawnDate: '20 February 2024'
		} as unknown as S62aCaseView;

		const result = getKeyDatesSectionItems(fullyPopulatedFields);

		assert.strictEqual(result.length, 5);

		assert.deepStrictEqual(result[0], {
			key: { text: 'Application valid' },
			value: { text: '1 January 2024' }
		});

		assert.deepStrictEqual(result[1], {
			key: { text: 'Representation period' },
			value: { text: '2 January 2024 to 16 January 2024' }
		});

		assert.deepStrictEqual(result[2], {
			key: { text: 'Target decision' },
			value: { text: '1 March 2024' }
		});

		assert.deepStrictEqual(result[3], {
			key: { text: 'Decision issued' },
			value: { text: '28 February 2024' }
		});

		assert.deepStrictEqual(result[4], {
			key: { text: 'Withdrawn' },
			value: { text: '20 February 2024' }
		});
	});

	it('should omit representation period if start date is missing', () => {
		const missingStartFields = {
			representationPeriodEndDateTime: '16 January 2024'
		} as unknown as S62aCaseView;

		const result = getKeyDatesSectionItems(missingStartFields);
		const representationItem = result.find((item) => item.key.text === 'Representation period');

		assert.strictEqual(representationItem, undefined);
	});

	it('should omit representation period if end date is missing', () => {
		const missingEndFields = {
			representationPeriodStartDateTime: '2 January 2024'
		} as unknown as S62aCaseView;

		const result = getKeyDatesSectionItems(missingEndFields);
		const representationItem = result.find((item) => item.key.text === 'Representation period');

		assert.strictEqual(representationItem, undefined);
	});

	it('should prefer extendedTargetDecisionDate over targetDecisionDate when both are present', () => {
		const multipleDecisionDatesFields = {
			targetDecisionDate: '1 March 2024',
			extendedTargetDecisionDate: '15 March 2024'
		} as unknown as S62aCaseView;

		const result = getKeyDatesSectionItems(multipleDecisionDatesFields);
		const targetDecisionItem = result.find((item) => item.key.text === 'Target decision');

		assert.deepStrictEqual(targetDecisionItem, {
			key: { text: 'Target decision' },
			value: { text: '15 March 2024' }
		});
	});
});

describe('getHearingSectionItems', () => {
	it('should return an empty array if no hearing details are provided', () => {
		const missingFields = {} as unknown as S62aCaseView;
		const result = getHearingSectionItems(missingFields);

		assert.deepStrictEqual(result, []);
	});

	it('should return only the hearing date item if no venue is provided', () => {
		const dateOnlyFields = {
			hearingDate: '20 June 2024 at 1:30pm'
		} as unknown as S62aCaseView;
		const result = getHearingSectionItems(dateOnlyFields);

		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Date' },
			value: { text: '20 June 2024 at 1:30pm' }
		});
	});

	it('should return only the hearing venue item if no date is provided', () => {
		const venueOnlyFields = {
			hearingVenue: 'Bristol City Hall'
		} as unknown as S62aCaseView;
		const result = getHearingSectionItems(venueOnlyFields);

		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Venue' },
			value: { text: 'Bristol City Hall' }
		});
	});

	it('should return both hearing date and venue items when both are provided', () => {
		const fullyPopulatedFields = {
			hearingDate: '20 June 2024 at 1:30pm',
			hearingVenue: 'Bristol City Hall'
		} as unknown as S62aCaseView;
		const result = getHearingSectionItems(fullyPopulatedFields);

		assert.strictEqual(result.length, 2);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Date' },
			value: { text: '20 June 2024 at 1:30pm' }
		});
		assert.deepStrictEqual(result[1], {
			key: { text: 'Venue' },
			value: { text: 'Bristol City Hall' }
		});
	});
});

describe('getDecisionSectionItems', () => {
	it('should return an empty array if no decision details are provided', () => {
		const missingFields = {} as unknown as S62aCaseView;
		const result = getDecisionSectionItems(missingFields);

		assert.deepStrictEqual(result, []);
	});

	it('should return only the decision date item if no outcome is provided', () => {
		const dateOnlyFields = {
			decisionDate: '28 February 2024'
		} as unknown as S62aCaseView;
		const result = getDecisionSectionItems(dateOnlyFields);

		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Date' },
			value: { text: '28 February 2024' }
		});
	});

	it('should return only the decision outcome item if no date is provided', () => {
		const outcomeOnlyFields = {
			decisionOutcome: 'Approved'
		} as unknown as S62aCaseView;
		const result = getDecisionSectionItems(outcomeOnlyFields);

		assert.strictEqual(result.length, 1);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Outcome' },
			value: { text: 'Approved' }
		});
	});

	it('should return both decision date and outcome items when both are provided', () => {
		const fullyPopulatedFields = {
			decisionDate: '28 February 2024',
			decisionOutcome: 'Approved'
		} as unknown as S62aCaseView;
		const result = getDecisionSectionItems(fullyPopulatedFields);

		assert.strictEqual(result.length, 2);
		assert.deepStrictEqual(result[0], {
			key: { text: 'Date' },
			value: { text: '28 February 2024' }
		});
		assert.deepStrictEqual(result[1], {
			key: { text: 'Outcome' },
			value: { text: 'Approved' }
		});
	});
});

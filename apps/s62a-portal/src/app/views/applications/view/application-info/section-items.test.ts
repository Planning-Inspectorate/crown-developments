import assert from 'assert';
import { describe, it } from 'node:test';
import { getAboutThisApplicationSectionItems } from './section-items.ts';
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
			procedure: 'Hearing'
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

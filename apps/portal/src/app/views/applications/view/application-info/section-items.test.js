import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	getAboutThisApplicationSectionItems,
	getApplicationDecisionSectionItems,
	getImportantDatesSectionItems,
	getProcedureDetailsSectionItems
} from './section-items.js';

describe('section-items.js', () => {
	describe('getAboutThisApplicationSectionItems', () => {
		it('should return all section items with northing/easting', async () => {
			const baseUrl = '/applications';
			const crownDevelopmentFields = {
				applicantName: 'Test Name',
				siteCoordinates: {
					easting: 654321,
					northing: 123456
				},
				lpaName: 'System Test Borough Council',
				description: 'a new crown dev application',
				applicationType: 'Planning permission',
				stage: 'Consultation'
			};
			assert.deepStrictEqual(getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields), [
				{
					key: {
						text: 'Type of application'
					},
					value: {
						text: 'Planning permission'
					}
				},
				{
					key: {
						text: 'Local planning authority'
					},
					value: {
						text: 'System Test Borough Council'
					}
				},
				{
					key: {
						text: 'Applicant name'
					},
					value: {
						text: 'Test Name'
					}
				},
				{
					key: {
						text: 'Site address'
					},
					value: {
						text: 'Easting: 654321, Northing: 123456'
					}
				},
				{
					key: {
						text: 'Description of the proposed development'
					},
					value: {
						text: 'a new crown dev application'
					}
				},
				{
					key: {
						text: 'Stage'
					},
					value: {
						text: 'Consultation'
					}
				},
				{
					key: {
						text: 'Application form'
					},
					value: {
						html: '<p class="govuk-body">To view the full application, go to the <a class="govuk-link govuk-link--no-visited-state" href="/applications/documents">Documents</a> section.</p>'
					}
				}
			]);
		});
		it('should return all section items with site address', async () => {
			const baseUrl = '/applications';
			const crownDevelopmentFields = {
				applicantName: 'Test Name',
				siteAddress: '1 The street, the town, the county. W1 1BW.',
				lpaName: 'System Test Borough Council',
				description: 'a new crown dev application',
				applicationType: 'Planning permission',
				stage: 'Consultation'
			};
			assert.deepStrictEqual(getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields), [
				{
					key: {
						text: 'Type of application'
					},
					value: {
						text: 'Planning permission'
					}
				},
				{
					key: {
						text: 'Local planning authority'
					},
					value: {
						text: 'System Test Borough Council'
					}
				},
				{
					key: {
						text: 'Applicant name'
					},
					value: {
						text: 'Test Name'
					}
				},
				{
					key: {
						text: 'Site address'
					},
					value: {
						text: '1 The street, the town, the county. W1 1BW.'
					}
				},
				{
					key: {
						text: 'Description of the proposed development'
					},
					value: {
						text: 'a new crown dev application'
					}
				},
				{
					key: {
						text: 'Stage'
					},
					value: {
						text: 'Consultation'
					}
				},
				{
					key: {
						text: 'Application form'
					},
					value: {
						html: '<p class="govuk-body">To view the full application, go to the <a class="govuk-link govuk-link--no-visited-state" href="/applications/documents">Documents</a> section.</p>'
					}
				}
			]);
		});
		it('should return section items without stage if stage is not populated', async () => {
			const baseUrl = '/applications';
			const crownDevelopmentFields = {
				applicantName: 'Test Name',
				siteAddress: '1 The street, the town, the county. W1 1BW.',
				lpaName: 'System Test Borough Council',
				description: 'a new crown dev application',
				applicationType: 'Planning permission'
			};
			assert.deepStrictEqual(getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields), [
				{
					key: {
						text: 'Type of application'
					},
					value: {
						text: 'Planning permission'
					}
				},
				{
					key: {
						text: 'Local planning authority'
					},
					value: {
						text: 'System Test Borough Council'
					}
				},
				{
					key: {
						text: 'Applicant name'
					},
					value: {
						text: 'Test Name'
					}
				},
				{
					key: {
						text: 'Site address'
					},
					value: {
						text: '1 The street, the town, the county. W1 1BW.'
					}
				},
				{
					key: {
						text: 'Description of the proposed development'
					},
					value: {
						text: 'a new crown dev application'
					}
				},
				{
					key: {
						text: 'Application form'
					},
					value: {
						html: '<p class="govuk-body">To view the full application, go to the <a class="govuk-link govuk-link--no-visited-state" href="/applications/documents">Documents</a> section.</p>'
					}
				}
			]);
		});
		it('should show both LPAs if SecondaryLpa is present and completed', async () => {
			const baseUrl = '/applications';
			const crownDevelopmentFields = {
				lpaName: 'Primary LPA',
				SecondaryLpa: { name: 'Secondary LPA' },
				applicantName: 'Test Name',
				siteAddress: '1 The street, the town, the county. W1 1BW.',
				description: 'desc',
				applicationType: 'Planning permission'
			};
			const items = getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields);
			const lpaItem = items.find((i) => i.key.text === 'Local planning authorities');
			assert.ok(lpaItem);
			assert.ok(lpaItem.value.html.includes('Primary LPA'));
			assert.ok(lpaItem.value.html.includes('Secondary LPA'));
		});

		it('should show only primary LPA if SecondaryLpa is not present', async () => {
			const baseUrl = '/applications';
			const crownDevelopmentFields = {
				lpaName: 'Primary LPA',
				applicantName: 'Test Name',
				siteAddress: '1 The street, the town, the county. W1 1BW.',
				description: 'desc',
				applicationType: 'Planning permission'
				// SecondaryLpa is not present at all
			};
			const items = getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields);
			const lpaItem = items.find((i) => i.key.text === 'Local planning authority');
			assert.ok(lpaItem);
			assert.strictEqual(lpaItem.value.text, 'Primary LPA');
		});

		it('should not show SecondaryLpa if not completed (name missing)', async () => {
			const baseUrl = '/applications';
			const crownDevelopmentFields = {
				lpaName: 'Primary LPA',
				SecondaryLpa: {}, // present but not completed
				applicantName: 'Test Name',
				siteAddress: '1 The street, the town, the county. W1 1BW.',
				description: 'desc',
				applicationType: 'Planning permission'
			};
			const items = getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields);
			const lpaItem = items.find((i) => i.key.text === 'Local planning authority');
			assert.ok(lpaItem);
			assert.strictEqual(lpaItem.value.text, 'Primary LPA');
		});
		it('should include withdrawn info if withdrawnDate is present', () => {
			const fields = {
				id: 'id-1',
				reference: 'reference-id-1',
				withdrawnDate: '1 January 2025'
			};
			const items = getImportantDatesSectionItems('/applications/id-1', fields);
			const withdrawnDate = items.some(
				(item) => item.key && item.key.text && item.key.text.toLowerCase() === 'withdrawal date'
			);
			assert.ok(withdrawnDate);
		});

		it('should not include withdrawn info if withdrawnDate is undefined', () => {
			const fields = {
				id: 'id-1',
				reference: 'reference-id-1'
			};
			const items = getAboutThisApplicationSectionItems('/applications/id-1', fields);
			const withdrawnDate = items.some(
				(item) => item.key && item.key.text && item.key.text.toLowerCase() === 'withdrawn date'
			);
			assert.ok(!withdrawnDate);
		});
	});
	describe('getImportantDatesSectionItems', () => {
		it('should return an empty list if important dates section should not be shown', async () => {
			assert.deepStrictEqual(getImportantDatesSectionItems(false, {}), []);
		});
		it('should return all items in important dates section', async () => {
			const crownDevelopmentFields = {
				applicationAcceptedDate: '9 October 2025',
				representationsPeriodEndDateTime: '31 January 2025 at 12:00am',
				representationsPeriodStartDateTime: '1 January 2025 at 12:00am',
				decisionDate: '11 October 2025'
			};
			assert.deepStrictEqual(getImportantDatesSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Application accepted date'
					},
					value: {
						text: '9 October 2025'
					}
				},
				{
					key: {
						text: 'Representation period'
					},
					value: {
						text: '1 January 2025 at 12:00am to 31 January 2025 at 12:00am'
					}
				},
				{
					key: {
						text: 'Decision date'
					},
					value: {
						text: '11 October 2025'
					}
				}
			]);
		});
		it('should return only application accepted date', async () => {
			const crownDevelopmentFields = {
				applicationAcceptedDate: '9 October 2025'
			};
			assert.deepStrictEqual(getImportantDatesSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Application accepted date'
					},
					value: {
						text: '9 October 2025'
					}
				}
			]);
		});
		it('should return only representation period', async () => {
			const crownDevelopmentFields = {
				representationsPeriodEndDateTime: '31 January 2025 at 12:00am',
				representationsPeriodStartDateTime: '1 January 2025 at 12:00am'
			};
			assert.deepStrictEqual(getImportantDatesSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Representation period'
					},
					value: {
						text: '1 January 2025 at 12:00am to 31 January 2025 at 12:00am'
					}
				}
			]);
		});
		it('should return only decision date', async () => {
			const crownDevelopmentFields = {
				decisionDate: '11 October 2025'
			};
			assert.deepStrictEqual(getImportantDatesSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Decision date'
					},
					value: {
						text: '11 October 2025'
					}
				}
			]);
		});
	});
	describe('getProcedureDetailsSectionItems', () => {
		it('should return an empty list if procedure details section should not be shown', async () => {
			assert.deepStrictEqual(getProcedureDetailsSectionItems(false, {}), []);
		});
		it('should return all hearing items in procedure section', async () => {
			const crownDevelopmentFields = {
				procedure: 'Hearing',
				isHearing: true,
				isInquiry: false,
				hearingDate: '17 December 2025',
				hearingVenue: 'The venue'
			};
			assert.deepStrictEqual(getProcedureDetailsSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Procedure type'
					},
					value: {
						text: 'Hearing'
					}
				},
				{
					key: {
						text: 'Hearing date'
					},
					value: {
						text: '17 December 2025'
					}
				},
				{
					key: {
						text: 'Hearing venue'
					},
					value: {
						text: 'The venue'
					}
				}
			]);
		});
		it('should return all inquiry items in procedure section', async () => {
			const crownDevelopmentFields = {
				procedure: 'Inquiry',
				isHearing: false,
				isInquiry: true,
				inquiryDate: '17 December 2025',
				inquiryVenue: 'The venue',
				inquiryStatementsDate: '18 December 2025',
				inquiryProofsOfEvidenceDate: '19 December 2025'
			};
			assert.deepStrictEqual(getProcedureDetailsSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Procedure type'
					},
					value: {
						text: 'Inquiry'
					}
				},
				{
					key: {
						text: 'Inquiry statements date'
					},
					value: {
						text: '18 December 2025'
					}
				},
				{
					key: {
						text: 'Inquiry date'
					},
					value: {
						text: '17 December 2025'
					}
				},
				{
					key: {
						text: 'Inquiry venue'
					},
					value: {
						text: 'The venue'
					}
				},
				{
					key: {
						text: 'Inquiry proofs of evidence date'
					},
					value: {
						text: '19 December 2025'
					}
				}
			]);
		});
	});
	describe('getApplicationDecisionSectionItems', () => {
		it('should return an empty list if application decision section should not be shown', async () => {
			assert.deepStrictEqual(getApplicationDecisionSectionItems(false, {}), []);
		});
		it('should return all items in important dates section', async () => {
			const crownDevelopmentFields = {
				decisionDate: '11 October 2025',
				decisionOutcome: 'Approved'
			};
			assert.deepStrictEqual(getApplicationDecisionSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Decision date'
					},
					value: {
						text: '11 October 2025'
					}
				},
				{
					key: {
						text: 'Decision outcome'
					},
					value: {
						text: 'Approved'
					}
				}
			]);
		});
		it('should return only the decision date', async () => {
			const crownDevelopmentFields = {
				decisionDate: '11 October 2025'
			};
			assert.deepStrictEqual(getApplicationDecisionSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Decision date'
					},
					value: {
						text: '11 October 2025'
					}
				}
			]);
		});
		it('should return only the decision outcome', async () => {
			const crownDevelopmentFields = {
				decisionOutcome: 'Approved'
			};
			assert.deepStrictEqual(getApplicationDecisionSectionItems(true, crownDevelopmentFields), [
				{
					key: {
						text: 'Decision outcome'
					},
					value: {
						text: 'Approved'
					}
				}
			]);
		});
	});
});

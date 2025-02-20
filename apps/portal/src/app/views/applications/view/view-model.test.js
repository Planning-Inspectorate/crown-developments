import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crownDevelopmentToViewModel } from './view-model.js';

describe('view-model', () => {
	describe('crownDevelopmentToViewModel', () => {
		it(`should map crown development view model`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				Type: {
					displayName: 'Planning permission'
				},
				ApplicantContact: {
					fullName: 'Applicant Name'
				},
				Lpa: {
					name: 'Test LPA'
				},
				Stage: {
					displayName: 'Inquiry'
				},
				Procedure: {
					displayName: 'Inquiry'
				},
				Event: {
					date: '2025-04-01T23:00:00.000Z',
					venue: 'City hall',
					statementsDate: '2025-04-30T23:00:00.000Z',
					proofsOfEvidenceDate: '2025-10-09T23:00:00.000Z'
				},
				applicationCompleteDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodStartDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodEndDate: '2025-10-09T23:00:00.000Z',
				decisionDate: '2025-10-09T23:00:00.000Z',
				description: 'A significant project',
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				}
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'reference-id-1',
				applicantName: 'Applicant Name',
				applicationType: 'Planning permission',
				crownDevelopmentContactEmail: 'crown.dev@planninginspectorate.gov.uk',
				description: 'A significant project',
				stage: 'Inquiry',
				lpaName: 'Test LPA',
				siteAddress: 'Site Street, Site Town, Site ONE',
				applicationCompleteDate: '10 Oct 2025',
				decisionDate: '10 Oct 2025',
				procedure: 'Inquiry',
				representationsPeriodEndDate: '10 Oct 2025',
				representationsPeriodStartDate: '10 Oct 2025'
			});
		});
		it(`should map site address if present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project',
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				}
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.equal(result.siteAddress, 'Site Street, Site Town, Site ONE');
		});
		it(`should not map site address if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.siteAddress, undefined);
		});
		it(`should not map nested fields if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.applicationType, undefined);
			assert.strictEqual(result.lpaName, undefined);
			assert.strictEqual(result.applicantName, undefined);
		});
		it(`should not map crownDevelopmentContactEmail field if config not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.crownDevelopmentContactEmail, undefined);
		});
		it(`should map inquiry fields if procedure id is inquiry`, () => {
			const input = {
				procedureId: 'inquiry',
				Event: {
					date: '2025-04-01T23:00:00.000Z',
					venue: 'City hall',
					statementsDate: '2025-04-30T23:00:00.000Z',
					proofsOfEvidenceDate: '2025-10-09T23:00:00.000Z'
				}
			};
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.isInquiry, true);
			assert.strictEqual(result.inquiryDate, '2 Apr 2025');
			assert.strictEqual(result.inquiryVenue, 'City hall');
			assert.strictEqual(result.inquiryStatementsDate, '1 May 2025');
			assert.strictEqual(result.inquiryProofsOfEvidenceDate, '10 Oct 2025');
		});
		it(`should map hearing fields if procedure id is hearing`, () => {
			const input = {
				procedureId: 'hearing',
				Event: {
					date: '2025-04-01T23:00:00.000Z',
					venue: 'City hall'
				}
			};
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.isHearing, true);
			assert.strictEqual(result.hearingDate, '2 Apr 2025');
			assert.strictEqual(result.hearingVenue, 'City hall');
		});
	});
});

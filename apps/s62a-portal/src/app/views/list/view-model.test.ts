import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s62aDevelopmentListItemToViewModel } from './view-model.ts';
import type { S62ADevelopmentListItem } from './view-model.ts';

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
					orgName: 'Applicant Name'
				},
				Lpa: {
					name: 'Test LPA'
				},
				SecondaryLpa: {
					name: 'Test SecondaryLPA'
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
				applicationAcceptedDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodStartDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodEndDate: '2025-10-09T23:00:00.000Z',
				representationsPublishDate: '2025-10-09T09:00:00.000Z',
				decisionDate: '2025-10-09T23:00:00.000Z',
				DecisionOutcome: {
					displayName: 'Approved'
				},
				description: 'A significant project',
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				},
				containsDistressingContent: true,
				withdrawnDate: null
			};
			//const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			const result = s62aDevelopmentListItemToViewModel(input as unknown as S62ADevelopmentListItem);
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'reference-id-1',
				applicantName: 'Applicant Name',
				applicationType: 'Planning permission',
				applicantOrganisations: undefined,
				stage: 'Inquiry',
				lpaName: 'Test LPA'
			});
		});

		it(`should not map nested fields if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			//const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			const result = s62aDevelopmentListItemToViewModel(input as unknown as S62ADevelopmentListItem);
			assert.strictEqual(result.applicationType, undefined);
			assert.strictEqual(result.lpaName, undefined);
			assert.strictEqual(result.applicantName, undefined);
		});
		/* 		it(`should not map crownDevelopmentContactEmail field if config not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = crownDevelopmentToViewModel(input, undefined);
			assert.strictEqual(result.crownDevelopmentContactEmail, undefined);
		}); */

		it('should map applicantOrganisations if present', () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				Organisations: [
					{
						role: 'applicant',
						Organisation: {
							name: 'Applicant organisation 1'
						}
					},
					{
						role: 'applicant',
						Organisation: {
							name: 'Applicant organisation 2'
						}
					},
					{
						role: 'agent',
						Organisation: {
							name: 'Agent organisation'
						}
					}
				]
			};
			//const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			const result = s62aDevelopmentListItemToViewModel(input as unknown as S62ADevelopmentListItem);
			assert.ok(result.applicantOrganisations);
			assert.ok(Array.isArray(result.applicantOrganisations));
			assert.ok(result.applicantOrganisations.length === 2);
			assert.strictEqual(result.applicantOrganisations[0], 'Applicant organisation 1');
			assert.strictEqual(result.applicantOrganisations[1], 'Applicant organisation 2');
		});
	});
});

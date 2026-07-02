import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s62aViewFormattingFunction } from './view-model.ts';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { S62ADevelopmentListItem, S62ADevelopmentView } from './view-model.ts';

describe('view-model', () => {
	describe('genericDevelopmentToViewModel', () => {
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
			withdrawnDate: null,
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

		it(`should map development view model`, () => {
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentListItem,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			);
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'reference-id-1',
				developmentContactEmail: 's62a.dev@planninginspectorate.gov.uk',
				applicantOrganisations: ['Applicant organisation 1', 'Applicant organisation 2'],
				description: 'A significant project',
				stage: 'Inquiry',
				lpaName: 'Test LPA',
				SecondaryLpa: { name: 'Test SecondaryLPA' }
			});
		});

		it(`should not map extended s62a fields if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentListItem,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			) as S62ADevelopmentView;
			assert.strictEqual(result.stage, undefined);
			assert.strictEqual(result.applicantOrganisations, undefined);
			assert.strictEqual(result.lpaName, undefined);
			assert.strictEqual(result.SecondaryLpa, undefined);
		});
		it(`should not map developmentContactEmail field if config not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentListItem,
				undefined,
				s62aViewFormattingFunction
			) as S62ADevelopmentView;
			assert.strictEqual(result.developmentContactEmail, undefined);
		});

		it('should map applicantOrganisations if present', () => {
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentListItem,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			) as S62ADevelopmentView;
			assert.ok(result.applicantOrganisations);
			assert.ok(Array.isArray(result.applicantOrganisations));
			assert.ok(result.applicantOrganisations.length === 2);
			assert.strictEqual(result.applicantOrganisations[0], 'Applicant organisation 1');
			assert.strictEqual(result.applicantOrganisations[1], 'Applicant organisation 2');
		});
	});
});

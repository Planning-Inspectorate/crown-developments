import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s62aViewFormattingFunction } from './view-model.ts';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { S62ADevelopmentPayload, S62ADevelopmentView } from './view-model.ts';

describe('view-model', () => {
	describe('genericDevelopmentToViewModel', () => {
		const input = {
			id: 'id-1',
			reference: 'REF/2025/001',
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
				input as unknown as S62ADevelopmentPayload,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			);
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'REF/2025/001',
				referenceLink:
					'<a class="govuk-link" href="/applications/id-1/application-information">REF/<wbr>2025/<wbr>001</a>',
				developmentContactEmail: 's62a.dev@planninginspectorate.gov.uk',
				applicantOrganisations: 'Applicant organisation 1, Applicant organisation 2',
				description: 'A significant project',
				stage: 'Inquiry',
				lpaName: 'Test LPA',
				withdrawnDate: null,
				secondaryLpa: 'Test SecondaryLPA'
			});
		});

		it(`should not map extended s62a fields if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project',
				applicantOrganisations: ['Applicant organisation 1', 'Applicant organisation 2']
			};
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentPayload,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			) as S62ADevelopmentView;
			assert.strictEqual(result.stage, undefined);
			assert.strictEqual(result.lpaName, undefined);
			assert.strictEqual(result.secondaryLpa, undefined);
		});
		it(`should not map developmentContactEmail field if config not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentPayload,
				undefined,
				s62aViewFormattingFunction
			) as S62ADevelopmentView;
			assert.strictEqual(result.developmentContactEmail, undefined);
		});

		it('should map applicantOrganisations if present', () => {
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentPayload,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			) as S62ADevelopmentView;
			assert.ok(result.applicantOrganisations);
			assert.strictEqual(result.applicantOrganisations, 'Applicant organisation 1, Applicant organisation 2');
		});
	});
});

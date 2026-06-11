import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s62aToViewModel } from './view-model.ts';
import type { S62ACasePayload, S62ACaseView } from './view-model.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('Case list view model', () => {
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
			S62aToApplicants: [
				{
					roleId: ORGANISATION_ROLES_ID.APPLICANT,
					Organisation: { name: 'Applicant organisation 1' },
					id: 'rel-1',
					s62aId: 'case-1',
					organisationId: 'org-1',
					contactId: null
				},
				{
					roleId: ORGANISATION_ROLES_ID.APPLICANT,
					Organisation: { name: 'Applicant organisation 2' },
					id: 'rel-2',
					s62aId: 'case-1',
					organisationId: 'org-2',
					contactId: null
				},
				{
					roleId: 'agent',
					Organisation: { name: 'Agent organisation' },
					id: 'rel-3',
					s62aId: 'case-1',
					organisationId: 'org-3',
					contactId: null
				}
			]
		};

		it(`should map development view model`, () => {
			const result = s62aToViewModel(input as unknown as S62ACasePayload) as S62ACaseView;
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'REF/2025/001',
				referenceLink: '<a class="govuk-link" href="/cases/id-1">REF/<wbr>2025/<wbr>001</a>',
				lpaName: 'Test LPA',
				status: undefined,
				type: 'Planning permission',
				applicantOrganisations: ['Applicant organisation 1', 'Applicant organisation 2'],
				location: 'Site Street, Site Town, Site ONE'
			});
		});
		it('should map applicantOrganisations if present', () => {
			const result = s62aToViewModel(input as unknown as S62ACasePayload) as S62ACaseView;
			assert.ok(result.applicantOrganisations);
			assert.ok(Array.isArray(result.applicantOrganisations));
			assert.ok(result.applicantOrganisations.length === 2);
			assert.strictEqual(result.applicantOrganisations[0], 'Applicant organisation 1');
			assert.strictEqual(result.applicantOrganisations[1], 'Applicant organisation 2');
		});
	});
});

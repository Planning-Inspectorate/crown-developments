import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s62aViewFormattingFunction } from './view-model.ts';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { S62ADevelopmentPayload, S62ADevelopmentExtendedView } from './view-model.ts';

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
				postcode: 'SW1A 2AA'
			},
			containsDistressingContent: true,
			withdrawnDate: null,
			S62aToApplicants: [
				{
					roleId: 'applicant',
					Organisation: {
						name: 'Applicant organisation 1'
					}
				},
				{
					roleId: 'applicant',
					Organisation: {
						name: 'Applicant organisation 2'
					}
				},
				{
					roleId: 'agent',
					Organisation: {
						name: 'Agent organisation'
					}
				}
			]
		};
		const input2 = {
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
			SiteAddress: null,
			siteEasting: 123456,
			siteNorthing: 654321,
			containsDistressingContent: true,
			withdrawnDate: null,
			S62aToApplicants: [
				{
					roleId: 'applicant',
					Organisation: {
						name: 'Applicant organisation 1'
					}
				},
				{
					roleId: 'applicant',
					Organisation: {
						name: 'Applicant organisation 2'
					}
				},
				{
					roleId: 'agent',
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
				location: 'SW1A 2AA',
				applicantOrganisations: 'Applicant organisation 1, Applicant organisation 2',
				description: 'A significant project',
				stage: 'Inquiry',
				lpaFormatted: 'Test LPA<br>Test SecondaryLPA',
				lpaName: 'Test LPA',
				secondaryLpa: 'Test SecondaryLPA'
			});
		});

		it(`should map development view model with northing and easting`, () => {
			const result = mapDevelopmentToViewModel(
				input2 as unknown as S62ADevelopmentPayload,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			);
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'REF/2025/001',
				referenceLink:
					'<a class="govuk-link" href="/applications/id-1/application-information">REF/<wbr>2025/<wbr>001</a>',
				developmentContactEmail: 's62a.dev@planninginspectorate.gov.uk',
				location: 'Easting: 123456\nNorthing: 654321',
				applicantOrganisations: 'Applicant organisation 1, Applicant organisation 2',
				description: 'A significant project',
				stage: 'Inquiry',
				lpaFormatted: 'Test LPA<br>Test SecondaryLPA',
				lpaName: 'Test LPA',
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
			) as S62ADevelopmentExtendedView;
			assert.strictEqual(result.stage, undefined);
			assert.strictEqual(result.lpaFormatted, undefined);
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
			) as S62ADevelopmentExtendedView;
			assert.strictEqual(result.developmentContactEmail, undefined);
		});

		it('should map applicantOrganisations if present', () => {
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentPayload,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			) as S62ADevelopmentExtendedView;
			assert.ok(result.applicantOrganisations);
			assert.strictEqual(result.applicantOrganisations, 'Applicant organisation 1, Applicant organisation 2');
		});
	});

	describe('applicant names', () => {
		/** Runs the formatter with just the applicants, returning the applicant column value */
		function applicantsFor(applicants: unknown[]): string {
			const payload = { id: 'id-1', reference: 'REF/1', S62aToApplicants: applicants };
			return s62aViewFormattingFunction(payload as unknown as S62ADevelopmentPayload).applicantOrganisations;
		}

		it('should show an individual applicant as first and last name', () => {
			const result = applicantsFor([
				{ roleId: 'applicant', Organisation: null, Contact: { firstName: 'Jane', lastName: 'Smithson' } }
			]);
			assert.strictEqual(result, 'Jane Smithson');
		});

		it('should show only the last name when there is no first name', () => {
			const result = applicantsFor([
				{ roleId: 'applicant', Organisation: null, Contact: { firstName: null, lastName: 'Smithson' } }
			]);
			assert.strictEqual(result, 'Smithson');
		});

		it('should show only the first name when there is no last name', () => {
			const result = applicantsFor([
				{ roleId: 'applicant', Organisation: null, Contact: { firstName: 'Jane', lastName: null } }
			]);
			assert.strictEqual(result, 'Jane');
		});

		it('should show nothing for a contact with no names, rather than a stray separator', () => {
			const result = applicantsFor([
				{ roleId: 'applicant', Organisation: null, Contact: { firstName: null, lastName: null } }
			]);
			assert.strictEqual(result, '');
		});

		it('should show nothing when the applicant has neither an organisation nor a contact', () => {
			const result = applicantsFor([{ roleId: 'applicant', Organisation: null, Contact: null }]);
			assert.strictEqual(result, '');
		});

		it('should prefer the organisation name when both are present', () => {
			const result = applicantsFor([
				{
					roleId: 'applicant',
					Organisation: { name: 'Golf Estates Ltd' },
					Contact: { firstName: 'Oliver', lastName: 'Brown' }
				}
			]);
			assert.strictEqual(result, 'Golf Estates Ltd');
		});

		it('should join organisations and individuals in order, comma separated', () => {
			const result = applicantsFor([
				{ roleId: 'applicant', Organisation: { name: 'Golf Estates Ltd' }, Contact: null },
				{ roleId: 'applicant', Organisation: null, Contact: { firstName: 'Oliver', lastName: 'Brown' } }
			]);
			assert.strictEqual(result, 'Golf Estates Ltd, Oliver Brown');
		});

		it('should not show agents, whether organisations or individuals', () => {
			const result = applicantsFor([
				{ roleId: 'applicant', Organisation: { name: 'Applicant Ltd' }, Contact: null },
				{ roleId: 'agent', Organisation: { name: 'Agentco Planning' }, Contact: null },
				{ roleId: 'agent', Organisation: null, Contact: { firstName: 'Alex', lastName: 'Agent' } }
			]);
			assert.strictEqual(result, 'Applicant Ltd');
		});

		it('should return an empty string when there are no applicants', () => {
			assert.strictEqual(applicantsFor([]), '');
		});
	});
});

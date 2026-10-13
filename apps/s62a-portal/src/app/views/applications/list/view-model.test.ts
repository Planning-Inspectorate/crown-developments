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
			applicantTypeId: 'organisation',
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
			applicantTypeId: 'organisation',
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
				applicantDetails: 'Applicant organisation 1, Applicant organisation 2',
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
				applicantDetails: 'Applicant organisation 1, Applicant organisation 2',
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
				applicantDetails: ['Applicant organisation 1', 'Applicant organisation 2']
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

		it('should map applicantDetails if present', () => {
			const result = mapDevelopmentToViewModel(
				input as unknown as S62ADevelopmentPayload,
				's62a.dev@planninginspectorate.gov.uk',
				s62aViewFormattingFunction
			) as S62ADevelopmentExtendedView;
			assert.ok(result.applicantDetails);
			assert.strictEqual(result.applicantDetails, 'Applicant organisation 1, Applicant organisation 2');
		});
	});

	describe('applicant names', () => {
		function applicantsFor(applicants: unknown[], applicantTypeId: string = 'individual'): string {
			const payload = {
				id: 'id-1',
				reference: 'REF/1',
				applicantTypeId,
				S62aToApplicants: applicants
			};
			return s62aViewFormattingFunction(payload as unknown as S62ADevelopmentPayload).applicantDetails;
		}

		it('should format organisation applicants when applicantTypeId is ORGANISATION', () => {
			const result = applicantsFor(
				[{ roleId: 'applicant', Organisation: { name: 'Acme Corp' }, Contact: null }],
				'organisation'
			);
			assert.strictEqual(result, 'Acme Corp');
		});

		it('should ignore contacts when applicantTypeId is ORGANISATION', () => {
			const result = applicantsFor(
				[
					{
						roleId: 'applicant',
						Organisation: { name: 'Acme Corp' },
						Contact: { firstName: 'Jane', lastName: 'Smith' }
					}
				],
				'organisation'
			);
			assert.strictEqual(result, 'Acme Corp');
		});

		it('should join multiple individual applicants with a comma', () => {
			const result = applicantsFor(
				[
					{ roleId: 'applicant', Organisation: null, Contact: { firstName: 'Jane', lastName: 'Smith' } },
					{ roleId: 'applicant', Organisation: null, Contact: { firstName: 'John', lastName: 'Doe' } }
				],
				'individual'
			);
			assert.strictEqual(result, 'Jane Smith, John Doe');
		});

		it('should ignore whitespace-only name fields', () => {
			const result = applicantsFor(
				[{ roleId: 'applicant', Organisation: null, Contact: { firstName: '  ', lastName: 'Smith' } }],
				'individual'
			);
			assert.strictEqual(result, 'Smith');
		});

		it('should return empty string for unrecognised applicantTypeId', () => {
			const result = applicantsFor(
				[{ roleId: 'applicant', Organisation: { name: 'Acme Corp' }, Contact: null }],
				'UNKNOWN_TYPE'
			);
			assert.strictEqual(result, '');
		});
	});
});

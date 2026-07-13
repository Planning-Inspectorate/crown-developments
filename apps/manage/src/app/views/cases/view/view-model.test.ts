import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crownDevelopmentToViewModel as crownDevelopmentToViewModelStrict, mapNotes } from './view-model.ts';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { CrownDevelopmentPayload } from './payload-contracts.ts';
import { CASE_NOTE_MAX_LENGTH } from '@pins/crowndev-lib/util/questions.ts';

/**
 * Fixtures are deliberately partial DB records, and some assertions read keys that aren't on the
 * typed view model (the "should be undefined" checks). The wrapper casts the input at the boundary
 * and returns a loosely typed result so the behavioural assertions compile unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function crownDevelopmentToViewModel(input: Record<string, unknown>): any {
	return crownDevelopmentToViewModelStrict(input as unknown as CrownDevelopmentPayload);
}

describe('view-model', () => {
	describe('crownDevelopmentToViewModel', () => {
		it(`should use created date if no updated date`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date()
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.updatedDate, input.createdDate);
		});
		it(`should map reps period`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				representationsPeriodStartDate: new Date('2025-01-01T00:00Z'),
				representationsPeriodEndDate: new Date('2025-01-31T00:00Z')
			};
			const result = crownDevelopmentToViewModel(input);
			assert.deepStrictEqual(result.representationsPeriod, {
				start: new Date('2025-01-01T00:00Z'),
				end: new Date('2025-01-31T00:00Z')
			});
		});
		it(`should map site address if present`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.deepStrictEqual(result.siteAddress, {
				id: undefined,
				addressLine1: 'Site Street',
				addressLine2: '',
				county: '',
				townCity: 'Site Town',
				postcode: 'Site ONE'
			});
		});
		it(`should map category id if present`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				Category: {
					id: 'cat-1'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.deepStrictEqual(result.subCategoryId, 'cat-1');
		});
		it(`should map LPA fields`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				lpaId: 'lpa-1',
				Lpa: {
					name: 'LPA 1',
					email: 'lpa@example.com'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaId, 'lpa-1');
			assert.strictEqual(result.lpaEmail, 'lpa@example.com');
			assert.strictEqual(result.lpaAddress, undefined);
		});
		it(`should map LPA address if present`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				lpaId: 'lpa-1',
				Lpa: {
					name: 'LPA 1',
					email: 'lpa@example.com',
					Address: {
						line1: 'LPA Street',
						townCity: 'LPA Town',
						postcode: 'LPA ONE'
					}
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaId, 'lpa-1');
			assert.strictEqual(result.lpaEmail, 'lpa@example.com');
			assert.deepStrictEqual(result.lpaAddress, {
				id: undefined,
				addressLine1: 'LPA Street',
				addressLine2: '',
				county: '',
				townCity: 'LPA Town',
				postcode: 'LPA ONE'
			});
		});
		it(`should ignore contacts if not present`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date()
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactName, undefined);
			assert.strictEqual(result.agentContactName, undefined);
		});

		it('should map agent organisation address id if present', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				Organisations: [
					{
						id: 'applicant-rel',
						role: 'applicant',
						Organisation: {
							id: 'applicant-org',
							name: 'Applicant Org',
							addressId: 'address-id-2',
							Address: {
								id: 'address-id-2',
								line1: 'Some Street',
								line2: 'Some Village',
								townCity: 'Some Place',
								postcode: 'AP2 2AP'
							}
						}
					},
					{
						id: 'rel-1',
						role: 'agent',
						Organisation: {
							id: 'org-1',
							name: 'Agent Org',
							addressId: 'address-1',
							Address: {
								id: 'address-1',
								line1: '1 Agent Street',
								townCity: 'Agent Town',
								postcode: 'AG1 1AA'
							}
						}
					}
				]
			};

			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.agentOrganisationRelationId, 'rel-1');
			assert.strictEqual(result.agentOrganisationAddressId, 'address-1');
			assert.deepStrictEqual(result.agentOrganisationAddress, {
				id: 'address-1',
				addressLine1: '1 Agent Street',
				addressLine2: '',
				county: '',
				townCity: 'Agent Town',
				postcode: 'AG1 1AA'
			});
		});
		it('should not map event if not hearing or inquiry', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
		});
		it('should not map event fields if written-reps but should map procedureNotificationDate', () => {
			const procedureNotificationDate = new Date('2025-03-01T00:00:00Z');
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
				procedureNotificationDate,
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.writtenRepsProcedureNotificationDate, procedureNotificationDate);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
			assert.strictEqual(result.writtenRepsDate, undefined);
			assert.strictEqual(result.writtenRepsVenue, undefined);
		});
		it('should not map event fields if no event exists but should map procedureNotificationDate', () => {
			const procedureNotificationDate = new Date('2025-04-01T00:00:00Z');
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY,
				procedureNotificationDate,
				Event: null
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.inquiryProcedureNotificationDate, procedureNotificationDate);
			assert.strictEqual(result.inquiryDate, undefined);
			assert.strictEqual(result.inquiryVenue, undefined);
		});
		it('should map hearing', () => {
			const issuesReportPublishedDate = new Date('2025-06-01T00:00:00Z');
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.HEARING,
				Event: {
					date: 'd-1',
					venue: 'Some Place',
					prepDuration: new Prisma.Decimal(2),
					sittingDuration: new Prisma.Decimal(0),
					reportingDuration: new Prisma.Decimal(1),
					issuesReportPublishedDate
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, 'd-1');
			assert.strictEqual(result.hearingVenue, 'Some Place');
			assert.strictEqual(result.hearingDurationPrep, 2);
			assert.strictEqual(result.hearingDurationSitting, 0);
			assert.strictEqual(result.hearingDurationReporting, 1);
			assert.strictEqual(result.hearingIssuesReportPublishedDate, issuesReportPublishedDate);
		});
		it('should set hearing duration to dash when all duration fields are null', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.HEARING,
				Event: {
					date: 'd-1',
					venue: 'Some Place',
					prepDuration: null,
					sittingDuration: null,
					reportingDuration: null
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDuration, '-');
			assert.strictEqual(result.hearingDurationPrep, undefined);
			assert.strictEqual(result.hearingDurationSitting, undefined);
			assert.strictEqual(result.hearingDurationReporting, undefined);
		});

		it('should map inquiry', () => {
			const proofsOfEvidenceDate = new Date('2025-07-01T00:00:00Z');
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY,
				Event: {
					date: 'd-1',
					venue: 'Some Place',
					prepDuration: new Prisma.Decimal(2),
					sittingDuration: new Prisma.Decimal(0),
					reportingDuration: new Prisma.Decimal(1),
					preMeetingDate: '2025 01 01',
					proofsOfEvidenceDate
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.inquiryDate, 'd-1');
			assert.strictEqual(result.inquiryVenue, 'Some Place');
			assert.strictEqual(result.inquiryDurationPrep, 2);
			assert.strictEqual(result.inquiryDurationSitting, 0);
			assert.strictEqual(result.inquiryDurationReporting, 1);
			assert.strictEqual(result.inquiryPreMeetingDate, '2025 01 01');
			assert.strictEqual(result.inquiryProofsOfEvidenceDate, proofsOfEvidenceDate);
		});
		it('should set inquiry duration to dash when all duration fields are null', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY,
				Event: {
					date: new Date('2025-07-01T00:00:00Z'),
					venue: 'Some Place',
					prepDuration: null,
					sittingDuration: null,
					reportingDuration: null
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.deepStrictEqual(result.inquiryDate, new Date('2025-07-01T00:00:00Z'));
			assert.strictEqual(result.inquiryVenue, 'Some Place');
			assert.strictEqual(result.inquiryDuration, '-');
			assert.strictEqual(result.inquiryDurationPrep, undefined);
			assert.strictEqual(result.inquiryDurationSitting, undefined);
			assert.strictEqual(result.inquiryDurationReporting, undefined);
		});
		it(`should map boolean values to yes/no`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				isGreenBelt: true,
				siteIsVisibleFromPublicLand: false,
				containsDistressingContent: true
			};
			const result = crownDevelopmentToViewModel(input);
			assert.equal(result.isGreenBelt, 'yes');
			assert.equal(result.siteIsVisibleFromPublicLand, 'no');
			assert.equal(result.containsDistressingContent, 'yes');
		});
		it(`should map agent organisation if it exists`, () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Organisations: [
					{
						id: 'relation-1',
						organisationId: 'org-1',
						crownDevelopmentId: 'id-1',
						role: 'agent',
						Organisation: {
							id: 'org-1',
							addressId: 'address-1',
							name: 'Agent name',
							Address: {
								id: 'address-1',
								line1: 'Org Street',
								line2: 'Flat 1',
								townCity: 'Org Town',
								county: 'Org County',
								postcode: 'ORG1ST'
							}
						}
					}
				]
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.agentOrganisationName, 'Agent name');
			assert.deepStrictEqual(result.agentOrganisationAddress, {
				id: 'address-1',
				addressLine1: 'Org Street',
				addressLine2: 'Flat 1',
				townCity: 'Org Town',
				county: 'Org County',
				postcode: 'ORG1ST'
			});
		});
		it('should map agent contacts if they exist', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Organisations: [
					{
						id: 'relation-1',
						organisationId: 'org-1',
						crownDevelopmentId: 'id-1',
						role: 'agent',
						Organisation: {
							id: 'org-1',
							OrganisationToContact: [
								{
									id: 'agent-relation-1',
									Contact: {
										id: 'agent-id-1',
										firstName: 'Agent',
										lastName: 'One',
										email: 'agent1@test.com',
										telephoneNumber: null
									}
								},
								{
									id: 'agent-relation-2',
									Contact: {
										id: 'agent-id-2',
										firstName: 'Agent',
										lastName: 'Two',
										email: 'agent2@test.com',
										telephoneNumber: '2'
									}
								}
							]
						}
					}
				]
			};
			const result = crownDevelopmentToViewModel(input);
			assert.ok(Array.isArray(result.manageAgentContactDetails));
			assert.strictEqual(result.manageAgentContactDetails.length, 2);
			assert.deepStrictEqual(result.manageAgentContactDetails[0], {
				id: 'agent-id-1',
				organisationToContactRelationId: 'agent-relation-1',
				agentFirstName: 'Agent',
				agentLastName: 'One',
				agentContactEmail: 'agent1@test.com',
				agentContactTelephoneNumber: ''
			});
			assert.deepStrictEqual(result.manageAgentContactDetails[1], {
				id: 'agent-id-2',
				organisationToContactRelationId: 'agent-relation-2',
				agentFirstName: 'Agent',
				agentLastName: 'Two',
				agentContactEmail: 'agent2@test.com',
				agentContactTelephoneNumber: '2'
			});
		});
		it('should map applicant organisations if they exist', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Organisations: [
					{
						id: 'relation-1',
						organisationId: 'org-1',
						crownDevelopmentId: 'id-1',
						role: 'applicant',
						Organisation: {
							id: 'org-1',
							addressId: 'address-1',
							name: 'Org One',
							Address: {
								id: 'address-1',
								line1: 'Org Street',
								line2: 'Flat 1',
								townCity: 'Org Town',
								county: 'Org County',
								postcode: 'ORG1ST'
							}
						}
					},
					{
						id: 'relation-2',
						organisationId: 'org-2',
						crownDevelopmentId: 'id-1',
						role: 'applicant',
						Organisation: {
							id: 'org-2',
							addressId: 'address-2',
							name: 'Org Two',
							Address: {
								id: 'address-2',
								line1: 'Org Street 2',
								line2: 'Flat 2',
								townCity: 'Org Town 2',
								county: 'Org County 2',
								postcode: 'ORG2ND'
							}
						}
					}
				]
			};
			const result = crownDevelopmentToViewModel(input);
			assert.ok(Array.isArray(result.manageApplicantDetails));
			assert.strictEqual(result.manageApplicantDetails.length, 2);
			assert.deepStrictEqual(result.manageApplicantDetails[0], {
				id: 'org-1',
				organisationName: 'Org One',
				organisationAddress: {
					id: 'address-1',
					addressLine1: 'Org Street',
					addressLine2: 'Flat 1',
					townCity: 'Org Town',
					county: 'Org County',
					postcode: 'ORG1ST'
				},
				organisationRelationId: 'relation-1',
				organisationAddressId: 'address-1'
			});
			assert.deepStrictEqual(result.manageApplicantDetails[1], {
				id: 'org-2',
				organisationName: 'Org Two',
				organisationAddress: {
					id: 'address-2',
					addressLine1: 'Org Street 2',
					addressLine2: 'Flat 2',
					townCity: 'Org Town 2',
					county: 'Org County 2',
					postcode: 'ORG2ND'
				},
				organisationRelationId: 'relation-2',
				organisationAddressId: 'address-2'
			});
		});
		it('should map applicant contacts if they exist', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Organisations: [
					{
						id: 'relation-1',
						organisationId: 'org-1',
						crownDevelopmentId: 'id-1',
						role: 'applicant',
						Organisation: {
							id: 'org-1',
							OrganisationToContact: [
								{
									id: 'applicant-relation-1',
									Contact: {
										id: 'applicant-id-1',
										firstName: 'Applicant',
										lastName: 'One',
										email: 'applicant1@test.com',
										telephoneNumber: '123'
									}
								},
								{
									id: 'applicant-relation-2',
									Contact: {
										id: 'applicant-id-2',
										firstName: 'Applicant',
										lastName: 'Two',
										email: 'applicant2@test.com',
										telephoneNumber: '456'
									}
								}
							]
						}
					}
				]
			};
			const result = crownDevelopmentToViewModel(input);
			assert.ok(Array.isArray(result.manageApplicantContactDetails));
			assert.strictEqual(result.manageApplicantContactDetails.length, 2);
			assert.deepStrictEqual(result.manageApplicantContactDetails[0], {
				id: 'applicant-id-1',
				applicantFirstName: 'Applicant',
				applicantLastName: 'One',
				applicantContactEmail: 'applicant1@test.com',
				applicantContactTelephoneNumber: '123',
				applicantContactOrganisation: 'org-1',
				organisationToContactRelationId: 'applicant-relation-1'
			});
			assert.deepStrictEqual(result.manageApplicantContactDetails[1], {
				id: 'applicant-id-2',
				applicantFirstName: 'Applicant',
				applicantLastName: 'Two',
				applicantContactEmail: 'applicant2@test.com',
				applicantContactTelephoneNumber: '456',
				applicantContactOrganisation: 'org-1',
				organisationToContactRelationId: 'applicant-relation-2'
			});
		});

		it('should map secondary LPA fields if present', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				hasSecondaryLpa: true,
				SecondaryLpa: {
					email: 'secondarylpa@example.com',
					telephoneNumber: '0123456789',
					Address: {
						line1: 'Secondary LPA Street',
						townCity: 'Secondary LPA Town',
						postcode: 'SEC ONE'
					}
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hasSecondaryLpa, 'yes');
			assert.strictEqual(result.secondaryLpaEmail, 'secondarylpa@example.com');
			assert.strictEqual(result.secondaryLpaTelephoneNumber, '0123456789');
			assert.deepStrictEqual(result.secondaryLpaAddress, {
				id: undefined,
				addressLine1: 'Secondary LPA Street',
				addressLine2: '',
				county: '',
				townCity: 'Secondary LPA Town',
				postcode: 'SEC ONE'
			});
		});

		it('should not map secondary LPA fields if not present', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				hasSecondaryLpa: false
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.secondaryLpaEmail, undefined);
			assert.strictEqual(result.secondaryLpaTelephoneNumber, undefined);
			assert.strictEqual(result.secondaryLpaAddress, undefined);
		});
	});
	describe('mapNotes', () => {
		function callMapNotes(
			notes: Record<string, unknown>[],
			groupMembers: unknown,
			caseId = 'case-1'
		): ReturnType<typeof mapNotes> {
			return mapNotes(
				notes as unknown as Parameters<typeof mapNotes>[0],
				groupMembers as Parameters<typeof mapNotes>[1],
				caseId
			);
		}

		const emptyGroupMembers = { caseOfficers: [], inspectors: [] };

		it('should resolve author display name from group members, falling back to the raw id then Unknown', () => {
			const notes = [
				{ comment: 'first note', createdAt: new Date('2025-03-03T09:00:00Z'), userId: 'entra-officer' },
				{ comment: 'second note', createdAt: new Date('2025-03-02T09:00:00Z'), userId: 'not-in-any-group' }
			];
			const groupMembers = {
				caseOfficers: [{ id: 'entra-officer', displayName: 'Olive Officer' }],
				inspectors: [{ id: 'entra-inspector', displayName: 'Ian Inspector' }]
			};

			const result = callMapNotes(notes, groupMembers);

			assert.strictEqual(result.caseNotes[0].userName, 'Olive Officer');
			assert.strictEqual(result.caseNotes[1].userName, 'not-in-any-group');
		});

		it('should escape HTML in comments before converting newlines, and sort newest first', () => {
			const notes = [
				{ comment: 'older', createdAt: new Date('2025-01-01T00:00:00Z'), userId: 'u1' },
				{ comment: '<script>alert(1)</script>\nsecond line', createdAt: new Date('2025-05-01T00:00:00Z'), userId: 'u1' }
			];

			const result = callMapNotes(notes, emptyGroupMembers);

			assert.strictEqual(result.caseNotes[0].commentText.startsWith('&lt;script&gt;'), true);
			assert.strictEqual(result.caseNotes[0].commentText.includes('<script>'), false);
			assert.strictEqual(result.caseNotes[0].commentText.includes('<br'), true);
			assert.strictEqual(result.caseNotes[1].commentText, 'older');
		});

		it('should not add a read-more link when the comment is within the limit', () => {
			const notes = [{ comment: 'a short note', createdAt: new Date('2025-05-01T00:00:00Z'), userId: 'u1' }];

			const result = callMapNotes(notes, emptyGroupMembers);

			assert.strictEqual(result.caseNotes[0].truncatedCommentText, 'a short note');
			assert.strictEqual(result.caseNotes[0].truncatedCommentText.includes('Read more'), false);
		});

		it('should truncate and append a read-more link for an over-length comment', () => {
			const longComment = 'a'.repeat(CASE_NOTE_MAX_LENGTH + 1);
			const notes = [{ comment: longComment, createdAt: new Date('2025-05-01T00:00:00Z'), userId: 'u1' }];

			const result = callMapNotes(notes, emptyGroupMembers, 'ABCDE-1234');
			const output = result.caseNotes[0].truncatedCommentText;

			assert.strictEqual(output.startsWith('a'.repeat(CASE_NOTE_MAX_LENGTH)), true);
			assert.strictEqual(output.includes('Read more'), true);
			assert.strictEqual(output.includes('href="/cases/ABCDE-1234/application-notes"'), true);
		});

		it('should escape HTML before truncating and still append the read-more link', () => {
			const longComment = '<script>alert(1)</script>' + 'a'.repeat(CASE_NOTE_MAX_LENGTH);
			const notes = [{ comment: longComment, createdAt: new Date('2025-05-01T00:00:00Z'), userId: 'u1' }];

			const result = callMapNotes(notes, emptyGroupMembers, 'ABCDE-1234');
			const output = result.caseNotes[0].truncatedCommentText;

			assert.strictEqual(output.includes('&lt;script&gt;'), true);
			assert.strictEqual(output.includes('<script>'), false);
			assert.strictEqual(output.includes('Read more'), true);
		});
	});
});

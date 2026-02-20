import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crownDevelopmentToViewModel, editsToDatabaseUpdates } from './view-model.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @typedef {import('@pins/crowndev-database').Prisma.CrownDevelopmentGetPayload<{include: { ApplicantContact: { include: { Address: true } }, AgentContact: { include: { Address: true } }, Event: true, LpaContact: { include: { Address: true } } }}>} CrownDevelopment
 * @typedef {import('./types.js').CrownDevelopmentViewModel} CrownDevelopmentViewModel
 */

describe('view-model', () => {
	describe('crownDevelopmentToViewModel', () => {
		it(`should use created date if no updated date`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date()
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.updatedDate, input.createdDate);
		});
		it(`should map reps period`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				representationsPeriodStartDate: 'date-1',
				representationsPeriodEndDate: 'date-2'
			};
			const result = crownDevelopmentToViewModel(input);
			assert.deepStrictEqual(result.representationsPeriod, {
				start: 'date-1',
				end: 'date-2'
			});
		});
		it(`should map site address if present`, () => {
			/** @type {CrownDevelopment} */
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
			/** @type {CrownDevelopment} */
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
			/** @type {CrownDevelopment} */
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
			/** @type {CrownDevelopment} */
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
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date()
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactName, undefined);
			assert.strictEqual(result.agentContactName, undefined);
		});
		it('should map applicant if present', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				applicantContactId: 'c-1',
				ApplicantContact: { id: 'c-1', orgName: 'contact', email: 'contact@example.com' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactId, 'c-1');
			assert.strictEqual(result.applicantContactName, 'contact');
			assert.strictEqual(result.applicantContactEmail, 'contact@example.com');
			assert.strictEqual(result.agentContactName, undefined);
		});
		it('should map contacts if they exist', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				applicantContactId: 'c-1',
				ApplicantContact: { id: 'c-1', orgName: 'contact', email: 'contact@example.com' },
				agentContactId: 'c-3',
				AgentContact: { id: 'c-3', orgName: 'Agent', email: 'agent@example.com' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactId, 'c-1');
			assert.strictEqual(result.applicantContactName, 'contact');
			assert.strictEqual(result.applicantContactEmail, 'contact@example.com');
			assert.strictEqual(result.agentContactId, 'c-3');
			assert.strictEqual(result.agentContactName, 'Agent');
			assert.strictEqual(result.agentContactEmail, 'agent@example.com');
		});
		it('should map contact address if they exist', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				applicantContactId: 'c-1',
				ApplicantContact: {
					id: 'c-1',
					orgName: 'contact',
					email: 'contact@example.com',
					addressId: 'address-id-1',
					Address: {
						line1: 'Some Street',
						line2: 'Some Village',
						townCity: 'Some Place',
						postcode: 'Some PostCode'
					}
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaContactName, undefined);
			assert.strictEqual(result.applicantContactId, 'c-1');
			assert.strictEqual(result.applicantContactName, 'contact');
			assert.strictEqual(result.applicantContactEmail, 'contact@example.com');
			assert.deepStrictEqual(result.applicantContactAddress, {
				id: undefined,
				addressLine1: 'Some Street',
				addressLine2: 'Some Village',
				townCity: 'Some Place',
				county: '',
				postcode: 'Some PostCode'
			});
			assert.strictEqual(result.applicantContactAddressId, 'address-id-1');
			assert.strictEqual(result.agentContactName, undefined);
		});
		it('should not map event if not hearing or inquiry', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
		});
		it('should not map event if written-reps', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
		});
		it('should map hearing', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.HEARING,
				Event: {
					date: 'd-1',
					venue: 'Some Place',
					prepDuration: 'Prep: 2 days',
					sittingDuration: 'Sitting: 0 days',
					reportingDuration: 'Reporting: 1 days'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, 'd-1');
			assert.strictEqual(result.hearingVenue, 'Some Place');
			assert.strictEqual(result.hearingDurationPrep, 'Prep: 2 days');
			assert.strictEqual(result.hearingDurationSitting, 'Sitting: 0 days');
			assert.strictEqual(result.hearingDurationReporting, 'Reporting: 1 days');
		});

		it('should map inquiry', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY,
				Event: {
					date: 'd-1',
					venue: 'Some Place',
					prepDuration: 'Prep: 2 days',
					sittingDuration: 'Sitting: 0 days',
					reportingDuration: 'Reporting: 1 days',
					preMeetingDate: '2025 01 01'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.inquiryDate, 'd-1');
			assert.strictEqual(result.inquiryVenue, 'Some Place');
			assert.strictEqual(result.inquiryDurationPrep, 'Prep: 2 days');
			assert.strictEqual(result.inquiryDurationSitting, 'Sitting: 0 days');
			assert.strictEqual(result.inquiryDurationReporting, 'Reporting: 1 days');
			assert.strictEqual(result.inquiryPreMeetingDate, '2025 01 01');
		});
		it(`should map boolean values to yes/no`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				isGreenBelt: true,
				siteIsVisibleFromPublicLand: false
			};
			const result = crownDevelopmentToViewModel(input);
			assert.equal(result.isGreenBelt, 'yes');
			assert.equal(result.siteIsVisibleFromPublicLand, 'no');
		});
		it('should map applicant organisations if they exist', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Organisations: [
					{
						id: 'relation-1',
						organisationId: 'org-1',
						crownDevelopmentId: 'id-1',
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
				organisationRelationId: 'relation-1'
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
				organisationRelationId: 'relation-2'
			});
		});
	});

	describe('editsToDatabaseUpdates', () => {
		it('should map crown development fields', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				siteArea: 8.79,
				environmentalStatementReceivedDate: new Date('2025-01-17T00:00Z'),
				description: 'A big project to build something important',
				inquiryDurationSitting: 'Sitting: 0 days'
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.siteArea, toSave.siteArea);
			assert.strictEqual(updates.environmentalStatementReceivedDate, toSave.environmentalStatementReceivedDate);
			assert.strictEqual(updates.description, toSave.description);
		});
		it('should not map uneditable fields', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				siteArea: 8.79,
				environmentalStatementReceivedDate: new Date('2025-01-17T00:00Z'),
				description: 'A big project to build something important',
				reference: 'CASE/1',
				updatedDate: new Date('2025-01-17T10:23Z')
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.reference, undefined);
			assert.strictEqual(updates.updatedDate, undefined);
		});

		it(`should map siteArea to a number`, () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				siteArea: '0.125'
			};
			const result = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(result.siteArea, 0.125);
		});
		it(`should map siteNorthing and siteEasting to an int`, () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				siteNorthing: '123',
				siteEasting: '456'
			};
			const result = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(result.siteNorthing, 123);
			assert.strictEqual(result.siteEasting, 456);
		});
		it(`should map reps period`, () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				representationsPeriod: {
					start: 'date-1',
					end: 'date-2'
				}
			};
			const result = editsToDatabaseUpdates(toSave, {});
			assert.deepStrictEqual(result.representationsPeriodStartDate, 'date-1');
			assert.deepStrictEqual(result.representationsPeriodEndDate, 'date-2');
		});
		it('should map category relation', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				subCategoryId: 'cat-1'
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.Category?.connect?.id, 'cat-1');
		});
		it('should not map site address if no edits', () => {
			const updates = editsToDatabaseUpdates({}, {});
			assert.ok(updates);
			assert.strictEqual(updates.SiteAddress, undefined);
		});
		it('should set site address fields to empty if data removed', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				siteAddress: {
					postcode: ''
				}
			};
			const viewModel = {
				siteAddressId: 'address-1'
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.SiteAddress?.upsert);
			const upsert = updates.SiteAddress.upsert;
			assert.strictEqual(upsert.where?.id, 'address-1');
			assert.strictEqual(upsert.create?.postcode, '');
			assert.strictEqual(upsert.update?.postcode, '');
		});
		it('should map site address upsert', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				siteAddress: {
					postcode: 'NEW PSCD'
				}
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				siteAddressId: 'address-1'
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.SiteAddress?.upsert);
			const upsert = updates.SiteAddress.upsert;
			assert.strictEqual(upsert.where?.id, 'address-1');
			assert.strictEqual(upsert.create?.postcode, 'NEW PSCD');
			assert.strictEqual(upsert.update?.postcode, 'NEW PSCD');
		});
		it('should map contact relation create', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				applicantContactName: 'Applicant One',
				applicantContactEmail: 'applicant@example.com',
				agentContactName: 'Agent One',
				agentContactEmail: 'agent@example.com',
				agentContactTelephoneNumber: '0123456789'
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.ApplicantContact?.create?.orgName, 'Applicant One');
			assert.strictEqual(updates.ApplicantContact?.create?.email, 'applicant@example.com');
			assert.strictEqual(updates.AgentContact?.create?.orgName, 'Agent One');
			assert.strictEqual(updates.AgentContact?.create?.email, 'agent@example.com');
			assert.strictEqual(updates.AgentContact?.create?.telephoneNumber, '0123456789');
		});
		it('should map contact relation update', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				applicantContactName: 'Applicant One',
				applicantContactEmail: 'applicant@example.com'
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				applicantContactId: 'contact-id-1'
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.strictEqual(updates.ApplicantContact?.update?.orgName, 'Applicant One');
			assert.strictEqual(updates.ApplicantContact?.update?.email, 'applicant@example.com');
		});
		it('should map contact relation update with address upsert', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				applicantContactName: 'Applicant One',
				applicantContactEmail: 'applicant@example.com',
				applicantContactAddress: {
					addressLine1: 'Street',
					townCity: 'City',
					postcode: 'PSC01D'
				}
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				applicantContactId: 'contact-id-1',
				applicantContactAddressId: 'address-id-1'
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.strictEqual(updates.ApplicantContact?.update?.orgName, 'Applicant One');
			assert.strictEqual(updates.ApplicantContact?.update?.email, 'applicant@example.com');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.where?.id, 'address-id-1');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.create?.line1, 'Street');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.update?.line1, 'Street');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.create?.townCity, 'City');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.update?.townCity, 'City');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.create?.postcode, 'PSC01D');
			assert.strictEqual(updates.ApplicantContact?.update?.Address?.upsert?.update?.postcode, 'PSC01D');
		});

		it('should not map event if no edits', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.Event, undefined);
		});
		it('should map event if nulled', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				inquiryStatementsDate: null,
				inquiryCaseManagementConferenceDate: null,
				inquiryProofsOfEvidenceDate: null
			};

			const updates = editsToDatabaseUpdates(toSave, { procedureId: APPLICATION_PROCEDURE_ID.INQUIRY });

			assert.strictEqual(updates.Event?.upsert?.update?.statementsDate, null);
			assert.strictEqual(updates.Event?.upsert?.update?.caseManagementConferenceDate, null);
			assert.strictEqual(updates.Event?.upsert?.update?.proofsOfEvidenceDate, null);
		});

		it('should map procedure notification date', () => {
			const date = new Date('2025-01-20T00:00:00Z');
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				inquiryProcedureNotificationDate: date
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.strictEqual(updates.procedureNotificationDate, date);
		});
		it('should map event upsert', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				inquiryVenue: 'some place',
				inquiryDurationPrep: 'some value',
				inquiryDurationSitting: 'some value',
				inquiryDurationReporting: 'some value'
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.Event?.upsert);
			const upsert = updates.Event.upsert;
			assert.strictEqual(upsert.where?.id, undefined);
			assert.strictEqual(upsert.create?.venue, 'some place');
			assert.strictEqual(upsert.update?.prepDuration, 'some value');
			assert.strictEqual(upsert.update?.sittingDuration, 'some value');
			assert.strictEqual(upsert.update?.reportingDuration, 'some value');
		});
		it('should map inquiry with missing event fields', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY,
				Event: {
					date: 'd-1',
					venue: 'Some Place',
					prepDuration: null,
					sittingDuration: undefined,
					reportingDuration: '',
					inquiryDuration: '-'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.inquiryDate, 'd-1');
			assert.strictEqual(result.inquiryVenue, 'Some Place');
			assert.strictEqual(result.inquiryDuration, '-');
			assert.strictEqual(result.inquiryDurationPrep, undefined);
			assert.strictEqual(result.inquiryDurationSitting, undefined);
			assert.strictEqual(result.inquiryDurationReporting, undefined);
		});
		it('should map all hearing fields', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				hearingDate: new Date('2025-01-25T00:00:00Z'),
				hearingDuration: 'Prep',
				hearingVenue: 'some venue',
				hearingNotificationDate: new Date('2025-03-13T00:00:00Z'),
				hearingIssuesReportPublishedDate: new Date('2025-01-12T00:00:00Z')
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.HEARING
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.Event?.upsert);
			const upsert = updates.Event.upsert;
			assert.strictEqual(upsert.where?.id, undefined);
			assert.strictEqual(upsert.update?.venue, toSave.hearingVenue);
			assert.strictEqual(upsert.update?.date, toSave.hearingDate);
			assert.strictEqual(upsert.update?.prepDuration, toSave.prepDuration);
			assert.strictEqual(upsert.update?.sittingDuration, toSave.sittingDuration);
			assert.strictEqual(upsert.update?.reportingDuration, toSave.reportingDuration);
			assert.strictEqual(upsert.update?.notificationDate, toSave.hearingNotificationDate);
			assert.strictEqual(upsert.update?.issuesReportPublishedDate, toSave.hearingIssuesReportPublishedDate);
		});
		it('should map all inquiry fields', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				inquiryStatementsDate: new Date('2025-01-25T00:00:00Z'),
				inquiryDate: new Date('2025-03-13T00:00:00Z'),
				inquiryDuration: 'Sitting',
				inquiryVenue: 'Some place',
				inquiryNotificationDate: new Date('2025-01-12T00:00:00Z'),
				inquiryCaseManagementConferenceDate: new Date('2025-02-09T00:00:00Z'),
				inquiryPreMeetingDate: new Date('2025-01-12T00:00:00Z'),
				inquiryProofsOfEvidenceDate: new Date('2025-03-01T00:00:00Z')
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.Event?.upsert);
			const upsert = updates.Event.upsert;
			assert.strictEqual(upsert.where?.id, undefined);
			assert.strictEqual(upsert.update?.venue, toSave.inquiryVenue);
			assert.strictEqual(upsert.update?.date, toSave.inquiryDate);
			assert.strictEqual(upsert.update?.statementsDate, toSave.inquiryStatementsDate);
			assert.strictEqual(upsert.update?.duration, toSave.prepDuration);
			assert.strictEqual(upsert.update?.sittingDuration, toSave.sittingDuration);
			assert.strictEqual(upsert.update?.reportingDuration, toSave.reportingDuration);
			assert.strictEqual(upsert.update?.notificationDate, toSave.inquiryNotificationDate);
			assert.strictEqual(upsert.update?.caseManagementConferenceDate, toSave.inquiryCaseManagementConferenceDate);
			assert.strictEqual(upsert.update?.preMeetingDate, toSave.inquiryPreMeetingDate);
			assert.strictEqual(upsert.update?.proofsOfEvidenceDate, toSave.inquiryProofsOfEvidenceDate);
		});
		it('should set event upsert where to undefined not null', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				inquiryVenue: 'some place',
				inquiryDurationPrep: 'prep: 1 days'
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				eventId: null,
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.Event?.upsert);
			const upsert = updates.Event.upsert;
			assert.strictEqual(upsert.where, undefined);
			assert.strictEqual(upsert.create?.venue, 'some place');
			assert.strictEqual(upsert.update?.prepDuration, 'prep: 1 days');
		});
		it('should map event upsert with id', () => {
			/** @type {CrownDevelopmentViewModel} */
			const toSave = {
				hearingVenue: 'some place',
				hearingDurationPrep: 'prep: 1.5 days'
			};
			/** @type {CrownDevelopmentViewModel} */
			const viewModel = {
				eventId: 'event-id',
				procedureId: APPLICATION_PROCEDURE_ID.HEARING
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.Event?.upsert);
			const upsert = updates.Event.upsert;
			assert.strictEqual(upsert.where?.id, 'event-id');
			assert.strictEqual(upsert.create?.venue, 'some place');
			assert.strictEqual(upsert.update?.prepDuration, 'prep: 1.5 days');
		});
		describe('should delete the event if it exists and nullify procedureNotificationDate', () => {
			const testCases = [
				{ from: APPLICATION_PROCEDURE_ID.WRITTEN_REPS, to: APPLICATION_PROCEDURE_ID.INQUIRY },
				{ from: APPLICATION_PROCEDURE_ID.WRITTEN_REPS, to: APPLICATION_PROCEDURE_ID.HEARING },
				{ from: APPLICATION_PROCEDURE_ID.INQUIRY, to: APPLICATION_PROCEDURE_ID.WRITTEN_REPS },
				{ from: APPLICATION_PROCEDURE_ID.INQUIRY, to: APPLICATION_PROCEDURE_ID.HEARING },
				{ from: APPLICATION_PROCEDURE_ID.HEARING, to: APPLICATION_PROCEDURE_ID.WRITTEN_REPS },
				{ from: APPLICATION_PROCEDURE_ID.HEARING, to: APPLICATION_PROCEDURE_ID.INQUIRY }
			];
			testCases.forEach(({ from, to }) => {
				it(`if procedure changed from ${from} to ${to}`, () => {
					const toSave = {
						procedureId: to
					};
					const viewModel = {
						procedureId: from,
						eventId: 'event-id'
					};
					const updates = editsToDatabaseUpdates(toSave, viewModel);
					assert.ok(updates);
					assert.deepStrictEqual(updates.Procedure, {
						connect: { id: to }
					});
					assert.ok(updates.Event?.delete);
					assert.strictEqual(updates.procedureNotificationDate, null);
				});
			});
			const nullTestCases = [
				{ from: APPLICATION_PROCEDURE_ID.WRITTEN_REPS, to: null },
				{ from: APPLICATION_PROCEDURE_ID.INQUIRY, to: null },
				{ from: APPLICATION_PROCEDURE_ID.HEARING, to: null }
			];
			nullTestCases.forEach(({ from, to }) => {
				it(`if procedure changed from ${from} to null`, () => {
					const toSave = {
						procedureId: to
					};
					const viewModel = {
						procedureId: from,
						eventId: 'event-id'
					};
					const updates = editsToDatabaseUpdates(toSave, viewModel);
					assert.ok(updates);
					assert.deepStrictEqual(updates.Procedure, {
						disconnect: true
					});
					assert.ok(updates.Event?.delete);
					assert.strictEqual(updates.procedureNotificationDate, null);
				});
			});
		});
		it('should not delete the event if no event exists', () => {
			const toSave = {
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
				eventId: null
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.deepStrictEqual(
				{
					Procedure: updates.Procedure,
					EventDelete: updates.Event?.delete,
					ProcedureNotificationDate: updates.procedureNotificationDate
				},
				{
					Procedure: { connect: { id: APPLICATION_PROCEDURE_ID.INQUIRY } },
					EventDelete: undefined,
					ProcedureNotificationDate: null
				}
			);
		});
		it('should not delete event or nullify procedureNotificationDate if procedure not changed', () => {
			const toSave = {
				procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS
			};
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
				eventId: 'event-id'
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.deepStrictEqual(
				{
					Procedure: updates.Procedure,
					EventDelete: updates.Event?.delete,
					ProcedureNotificationDate: updates.procedureNotificationDate
				},
				{
					Procedure: undefined,
					EventDelete: undefined,
					ProcedureNotificationDate: undefined
				}
			);
		});
		it('should map secondary LPA fields if present', () => {
			/** @type {CrownDevelopment} */
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
			/** @type {CrownDevelopment} */
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

		it('should set hasSecondaryLpa to no by default for existing cases which have not answered hasSecondaryLpa previously', () => {
			const toSave = {}; // no secondaryLpaId or secondaryLocalPlanningAuthority
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(Object.prototype.hasOwnProperty.call(updates, 'hasSecondaryLpa'), false);
		});

		it('should set hasSecondaryLpa to false and disconnect SecondaryLpa if hasSecondaryLpa is false', () => {
			const toSave = {
				hasSecondaryLpa: false,
				secondaryLpaId: 'lpa-2'
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(updates.hasSecondaryLpa, false);
			assert.deepStrictEqual(updates.SecondaryLpa, { disconnect: true });
			assert.strictEqual(updates.secondaryLpaId, undefined); // should be removed
		});

		it('should set hasSecondaryLpa to false and disconnect SecondaryLpa if secondaryLpaId is null', () => {
			const toSave = {
				secondaryLpaId: null
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(updates.hasSecondaryLpa, false);
			assert.deepStrictEqual(updates.SecondaryLpa, { disconnect: true });
			assert.strictEqual(updates.secondaryLpaId, undefined); // should be removed
		});
	});

	describe('manageApplicantContactDetails organisation updates', () => {
		const getUpdateByRelationId = (updates, relationId) =>
			updates?.Organisations?.update?.find((u) => u.where?.id === relationId);

		it('does not create join-table updates when changing details for a single existing contact', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'New',
						applicantLastName: 'Name',
						applicantContactEmail: 'new@example.com'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				],
				manageApplicantContactDetails: [
					{
						id: 'contact-1',
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'Old',
						applicantLastName: 'Name',
						applicantContactEmail: 'old@example.com'
					}
				]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.deepStrictEqual(updates.Organisations, { update: [] });
		});

		it('does not create join-table updates when changing details for multiple existing contacts', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'Changed'
					},
					{
						organisationToContactRelationId: 'join-2',
						id: 'contact-2',
						applicantContactOrganisation: 'org-2',
						applicantContactTelephoneNumber: '0123456789'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				],
				manageApplicantContactDetails: [
					{
						id: 'contact-1',
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'Old'
					},
					{
						id: 'contact-2',
						organisationToContactRelationId: 'join-2',
						applicantContactOrganisation: 'org-2',
						applicantContactTelephoneNumber: ''
					}
				]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.deepStrictEqual(updates.Organisations, { update: [] });
		});

		it('creates join-table updates when moving a single existing contact to a different organisation', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-2'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				],
				manageApplicantContactDetails: [
					{ id: 'contact-1', organisationToContactRelationId: 'join-1', applicantContactOrganisation: 'org-1' }
				]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates.Organisations?.update);

			const source = getUpdateByRelationId(updates, 'rel-1');
			const target = getUpdateByRelationId(updates, 'rel-2');

			assert.deepStrictEqual(source?.data?.Organisation?.update?.OrganisationToContact?.deleteMany, [{ id: 'join-1' }]);
			assert.strictEqual(
				target?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.connect?.id,
				'contact-1'
			);
		});

		it('creates join-table updates when moving multiple existing contacts to different organisations', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-2'
					},
					{
						organisationToContactRelationId: 'join-2',
						id: 'contact-2',
						applicantContactOrganisation: 'org-1'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				],
				manageApplicantContactDetails: [
					{ id: 'contact-1', organisationToContactRelationId: 'join-1', applicantContactOrganisation: 'org-1' },
					{ id: 'contact-2', organisationToContactRelationId: 'join-2', applicantContactOrganisation: 'org-2' }
				]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates.Organisations?.update);

			const rel1 = getUpdateByRelationId(updates, 'rel-1');
			const rel2 = getUpdateByRelationId(updates, 'rel-2');

			assert.ok(rel1?.data?.Organisation?.update?.OrganisationToContact?.create);
			assert.ok(rel1?.data?.Organisation?.update?.OrganisationToContact?.deleteMany);
			assert.ok(rel2?.data?.Organisation?.update?.OrganisationToContact?.create);
			assert.ok(rel2?.data?.Organisation?.update?.OrganisationToContact?.deleteMany);

			assert.deepStrictEqual(rel1.data.Organisation.update.OrganisationToContact.deleteMany, [{ id: 'join-1' }]);
			assert.strictEqual(rel1.data.Organisation.update.OrganisationToContact.create[0].Contact.connect.id, 'contact-2');

			assert.deepStrictEqual(rel2.data.Organisation.update.OrganisationToContact.deleteMany, [{ id: 'join-2' }]);
			assert.strictEqual(rel2.data.Organisation.update.OrganisationToContact.create[0].Contact.connect.id, 'contact-1');
		});
		it('moves an existing contact and keeps using Contact.connect when details are also edited', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-2',
						applicantFirstName: 'Edited',
						applicantContactEmail: 'edited@example.com'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				],
				manageApplicantContactDetails: [
					{
						id: 'contact-1',
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'Old',
						applicantContactEmail: 'old@example.com'
					}
				]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			const target = getUpdateByRelationId(updates, 'rel-2');
			assert.strictEqual(
				target?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.create,
				undefined
			);
			assert.strictEqual(
				target?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.connect?.id,
				'contact-1'
			);
		});

		it('adds a new contact to an organisation using Contact.create', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'First',
						applicantLastName: 'Last',
						applicantContactEmail: 'new@example.com',
						applicantContactTelephoneNumber: '01234'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			const rel1 = getUpdateByRelationId(updates, 'rel-1');
			assert.ok(rel1?.data?.Organisation?.update?.OrganisationToContact?.create);
			assert.strictEqual(
				rel1.data.Organisation.update.OrganisationToContact.create[0].Contact.create.email,
				'new@example.com'
			);
		});

		it('adds multiple new contacts across organisations', () => {
			const toSave = {
				manageApplicantContactDetails: [
					{
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'A',
						applicantLastName: 'One',
						applicantContactEmail: 'a@example.com'
					},
					{
						applicantContactOrganisation: 'org-2',
						applicantFirstName: 'B',
						applicantLastName: 'Two',
						applicantContactEmail: 'b@example.com'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				]
			};

			const updates = editsToDatabaseUpdates(toSave, viewModel);
			const rel1 = getUpdateByRelationId(updates, 'rel-1');
			const rel2 = getUpdateByRelationId(updates, 'rel-2');

			assert.strictEqual(
				rel1?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.create?.email,
				'a@example.com'
			);
			assert.strictEqual(
				rel2?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.create?.email,
				'b@example.com'
			);
		});
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crownDevelopmentToViewModel, editsToDatabaseUpdates } from './view-model.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @typedef {import('@prisma/client').Prisma.CrownDevelopmentGetPayload<{include: { ApplicantContact: { include: { Address: true } }, AgentContact: { include: { Address: true } }, Event: true, LpaContact: { include: { Address: true } } }}>} CrownDevelopment
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
				addressLine2: undefined,
				county: undefined,
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
				addressLine2: undefined,
				county: undefined,
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
				county: undefined,
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
					reportingDuration: 'Reporting: 1 days'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.inquiryDate, 'd-1');
			assert.strictEqual(result.inquiryVenue, 'Some Place');
			assert.strictEqual(result.inquiryDurationPrep, 'Prep: 2 days');
			assert.strictEqual(result.inquiryDurationSitting, 'Sitting: 0 days');
			assert.strictEqual(result.inquiryDurationReporting, 'Reporting: 1 days');
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
				hearingIssuesReportPublishedDate: new Date('2025-01-12T00:00:00Z'),
				hearingStatementsDate: new Date('2025-02-09T00:00:00Z'),
				hearingCaseManagementConferenceDate: new Date('2025-03-01T00:00:00Z')
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
			assert.strictEqual(upsert.update?.statementsDate, toSave.hearingStatementsDate);
			assert.strictEqual(upsert.update?.caseManagementConferenceDate, toSave.hearingCaseManagementConferenceDate);
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
	});
});

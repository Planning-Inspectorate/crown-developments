import { describe, it } from 'node:test';
import assert from 'node:assert';
import { editsToDatabaseUpdates as editsToDatabaseUpdatesForCaseType } from './view-model.ts';
import { crownEditsToDatabaseUpdates } from './crown-edits.ts';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { CrownDevelopmentSaveModel, CrownDevelopmentViewModel } from './view-model.ts';

/**
 * These tests exercise the Crown mapping via the orchestrator with the Crown case-type updater.
 *
 * Fixtures are deliberately partial DB/edit shapes, and some assertions read keys that aren't on the
 * typed result (the "should be undefined" checks).
 */
function editsToDatabaseUpdates(
	edits: Record<string, unknown>,
	viewModel: Record<string, unknown> = {},
	options?: { includeOrganisations?: boolean }
): any {
	return editsToDatabaseUpdatesForCaseType(
		edits as unknown as CrownDevelopmentSaveModel,
		viewModel as unknown as CrownDevelopmentViewModel,
		crownEditsToDatabaseUpdates,
		options
	);
}

describe('crown-edits', () => {
	describe('editsToDatabaseUpdates', () => {
		it('should map crown development fields', () => {
			const toSave = {
				siteArea: 8.79,
				environmentalStatementReceivedDate: new Date('2025-01-17T00:00Z'),
				description: 'A big project to build something important'
			};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.siteArea, 8.79);
			assert.strictEqual(updates.environmentalStatementReceivedDate, toSave.environmentalStatementReceivedDate);
			assert.strictEqual(updates.description, toSave.description);
		});
		it('should not map uneditable fields', () => {
			const toSave = {
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
		it(`should map siteNorthing and siteEasting to an int`, () => {
			const toSave = {
				siteNorthing: '123',
				siteEasting: '456'
			};
			const result = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(result.siteNorthing, 123);
			assert.strictEqual(result.siteEasting, 456);
		});

		it('should not include boolean fields if not in edits', () => {
			const toSave = {
				siteArea: 8.79
			};
			const result = editsToDatabaseUpdates(toSave, {});
			assert.strictEqual(result.environmentalImpactAssessment, undefined);
			assert.strictEqual(result.developmentPlan, undefined);
			assert.strictEqual(result.rightOfWay, undefined);
		});

		it(`should map reps period`, () => {
			const toSave = {
				representationsPeriod: {
					start: new Date('2025-01-01T00:00Z'),
					end: new Date('2025-01-31T00:00Z')
				}
			};
			const result = editsToDatabaseUpdates(toSave, {});
			assert.deepStrictEqual(result.representationsPeriodStartDate, new Date('2025-01-01T00:00Z'));
			assert.deepStrictEqual(result.representationsPeriodEndDate, new Date('2025-01-31T00:00Z'));
		});
		it('should map required foreign key scalar fields', () => {
			const edits = { typeId: 'type-2', lpaId: 'lpa-2' };
			const result = editsToDatabaseUpdates(edits, {});
			assert.deepStrictEqual(result.Type, { connect: { id: 'type-2' } });
			assert.deepStrictEqual(result.Lpa, { connect: { id: 'lpa-2' } });
		});
		it('should map optional foreign key scalar fields via connect or disconnect', () => {
			const edits = { decisionOutcomeId: 'dec-1', statusId: 'stat-1', stageId: 'stage-1' };
			const result = editsToDatabaseUpdates(edits, {});
			assert.deepStrictEqual(result.DecisionOutcome, { connect: { id: 'dec-1' } });
			assert.deepStrictEqual(result.Status, { connect: { id: 'stat-1' } });
			assert.deepStrictEqual(result.Stage, { connect: { id: 'stage-1' } });

			const edits2 = { decisionOutcomeId: undefined, statusId: undefined, stageId: undefined };
			const result2 = editsToDatabaseUpdates(edits2, {});
			assert.deepStrictEqual(result2.DecisionOutcome, { disconnect: true });
			assert.deepStrictEqual(result2.Status, { disconnect: true });
			assert.deepStrictEqual(result2.Stage, { disconnect: true });
		});
		it('should map category relation', () => {
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
			const toSave = {
				siteAddress: {
					postcode: 'NEW PSCD'
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
			assert.strictEqual(upsert.create?.postcode, 'NEW PSCD');
			assert.strictEqual(upsert.update?.postcode, 'NEW PSCD');
		});

		it('should not map event if no edits', () => {
			const toSave = {};
			const updates = editsToDatabaseUpdates(toSave, {});
			assert.ok(updates);
			assert.strictEqual(updates.Event, undefined);
		});
		it('should map event if nulled', () => {
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
			const toSave = {
				inquiryProcedureNotificationDate: date
			};
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.strictEqual(updates.procedureNotificationDate, date);
		});
		it('should map event upsert', () => {
			const toSave = {
				inquiryVenue: 'some place',
				inquiryDurationPrep: '1',
				inquiryDurationSitting: '2',
				inquiryDurationReporting: '3'
			};
			const viewModel = {
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
			};
			const updates = editsToDatabaseUpdates(toSave, viewModel);
			assert.ok(updates);
			assert.ok(updates.Event?.upsert);
			const upsert = updates.Event.upsert;
			assert.strictEqual(upsert.where?.id, undefined);
			assert.strictEqual(upsert.create?.venue, 'some place');
			assert.strictEqual(upsert.update?.prepDuration, 1);
			assert.strictEqual(upsert.update?.sittingDuration, 2);
			assert.strictEqual(upsert.update?.reportingDuration, 3);
		});
		it('should map all hearing fields', () => {
			const toSave = {
				hearingDate: new Date('2025-01-25T00:00:00Z'),
				hearingDuration: 'Prep',
				hearingVenue: 'some venue',
				hearingNotificationDate: new Date('2025-03-13T00:00:00Z'),
				hearingIssuesReportPublishedDate: new Date('2025-01-12T00:00:00Z')
			};
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
			const toSave = {
				inquiryVenue: 'some place',
				inquiryDurationPrep: '1'
			};

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
			assert.strictEqual(upsert.update?.prepDuration, 1);
		});
		it('should map event upsert with id', () => {
			const toSave = {
				hearingVenue: 'some place',
				hearingDurationPrep: '1.5'
			};
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
			assert.strictEqual(upsert.update?.prepDuration, 1.5);
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
		it('should include organisation updates if includeOrganisations is true by default', () => {
			const edits = {
				manageApplicantDetails: [
					{
						id: 'org-1',
						organisationRelationId: 'rel-1',
						organisationName: 'Org',
						organisationAddress: {},
						organisationAddressId: 'addr-1'
					}
				]
			};
			const result = editsToDatabaseUpdates(edits, {});
			assert.ok('Organisations' in result);
		});
		it('should not include organisation updates if includeOrganisations is false', () => {
			const edits = {
				manageApplicantDetails: [
					{
						id: 'org-1',
						organisationRelationId: 'rel-1',
						organisationName: 'Org',
						organisationAddress: {},
						organisationAddressId: 'addr-1'
					}
				]
			};
			const result = editsToDatabaseUpdates(edits, {}, { includeOrganisations: false });
			assert.ok(!('Organisations' in result));
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
		describe('decimal field normalization', () => {
			it('should coerce empty string decimal edits to null for Prisma update input', () => {
				const updates = editsToDatabaseUpdates(
					{
						siteArea: '',
						applicationFee: '',
						applicationFeeRefundAmount: '',
						cilAmount: ''
					},
					{}
				);

				assert.strictEqual(updates.siteArea, null);
				assert.strictEqual(updates.applicationFee, null);
				assert.strictEqual(updates.applicationFeeRefundAmount, null);
				assert.strictEqual(updates.cilAmount, null);
			});

			it('should keep non-empty decimal values unchanged', () => {
				const updates = editsToDatabaseUpdates(
					{
						siteArea: 12.34,
						applicationFee: 99.99
					},
					{}
				);

				assert.strictEqual(updates.siteArea, 12.34);
				assert.strictEqual(updates.applicationFee, 99.99);
			});
		});
	});
});

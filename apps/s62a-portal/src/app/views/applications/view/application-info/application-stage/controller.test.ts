import { describe, it } from 'node:test';
import { buildApplicationStages, type PublishedS62aApplication } from './controller.ts';
import assert from 'node:assert';
import { S62A_STAGE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { APPLICATION_PROCEDURE_ID, APPLICATION_STAGE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('buildApplicationStages', () => {
	it('should set current stageId to pre-application if the stage is null', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			procedureId: null,
			decisionOutcomeId: null
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.strictEqual(applicationStages.getCurrentStage()?.stageId, 'pre-application');
	});

	it('should resolve the current stage if it exists', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.VALIDATION,
			procedureId: null,
			decisionOutcomeId: null
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.strictEqual(applicationStages.getCurrentStage()?.stageId, 'validation');
	});

	it('should resolve the current stage to the last stage if there is a decision outcome', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.VALIDATION,
			procedureId: null,
			decisionOutcomeId: 'outcome-1'
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.strictEqual(applicationStages.getCurrentStage()?.stageId, 'post-decision');
	});

	it('should handle mismatches between stageId and procedureId by setting current stage to procedure-decision', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.WRITTEN_REPRESENTATIONS,
			procedureId: APPLICATION_STAGE_ID.HEARING,
			decisionOutcomeId: null
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.strictEqual(applicationStages.getCurrentStage()?.stageId, 'procedure-decision');
	});

	it('should resolve the core displayNames if it finds the stageIds in the S62A_STAGES', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.CONSULTATION,
			procedureId: null,
			decisionOutcomeId: null
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.ok(
			applicationStages.stages.some((stage) => stage.stageDisplayName === 'Validation'),
			'Expected to find a stage with display name "Validation"'
		);
		assert.ok(
			applicationStages.stages.some((stage) => stage.stageDisplayName === 'Consultation'),
			'Expected to find a stage with display name "Consultation"'
		);
		assert.ok(
			applicationStages.stages.some((stage) => stage.stageDisplayName === 'Procedure decision'),
			'Expected to find a stage with display name "Procedure decision"'
		);
		assert.ok(
			applicationStages.stages.some((stage) => stage.stageDisplayName === 'Reporting and decision'),
			'Expected to find a stage with display name "Reporting and decision"'
		);
	});
	it('should resolve the written representation displayName if it finds the stageId in the S62A_STAGES and the procedureId is written-rep', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.CONSULTATION,
			procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
			decisionOutcomeId: null
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.ok(
			applicationStages.stages.some((stage) => stage.stageDisplayName === 'Written representations'),
			'Expected to find a stage with display name "Written representations"'
		);
	});

	it('should resolve the hearing displayName if it finds the stageId in the S62A_STAGES and the procedureId is hearing', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.CONSULTATION,
			procedureId: APPLICATION_PROCEDURE_ID.HEARING,
			decisionOutcomeId: null
		} as unknown as PublishedS62aApplication;

		const applicationStages = buildApplicationStages(applicationDetails);

		assert.ok(
			applicationStages.stages.some((stage) => stage.stageDisplayName === 'Hearing'),
			'Expected to find a stage with display name "Hearing"'
		);
	});

	it('should default to procedure-decision when the stage is at hearing but procedure is not set to hearing', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.HEARING,
			procedureId: null,
			decisionOutcomeId: null
		};

		const applicationStages = buildApplicationStages(applicationDetails as unknown as PublishedS62aApplication);

		assert.strictEqual(applicationStages.getCurrentStage()?.stageId, 'procedure-decision');
	});

	it('should default to procedure-decision when the stage is at written-rep but procedure is not set to written-rep', () => {
		const applicationDetails = {
			applicationId: 'app-1',
			stageId: S62A_STAGE_ID.WRITTEN_REPRESENTATIONS,
			procedureId: null,
			decisionOutcomeId: null
		};

		const applicationStages = buildApplicationStages(applicationDetails as unknown as PublishedS62aApplication);

		assert.strictEqual(applicationStages.getCurrentStage()?.stageId, 'procedure-decision');
	});
});

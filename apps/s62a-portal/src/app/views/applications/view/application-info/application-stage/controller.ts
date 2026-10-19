import {
	ApplicationStageFactory,
	type StageItem
} from '@pins/crowndev-lib/application-stage/application-stage-factory.ts';
import { S62A_STAGE_ID, S62A_STAGES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { STAGE_STATUS } from '@pins/crowndev-lib/application-stage/stage-entity.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export type PublishedS62aApplication = Prisma.S62aCaseGetPayload<{
	select: { stageId: true; procedureId: true; decisionOutcomeId: true };
}>;

/**
 * Builds the application stages for an S62A application, resolving the current stage and any mismatches between the stageId and procedureId.
 */
export function buildApplicationStages(applicationDetails: PublishedS62aApplication) {
	const stages = resolveS62AStages(applicationDetails);
	const applicationStages = new ApplicationStageFactory(stages, {
		stageId: getStageId(applicationDetails, stages),
		decisionOutcomeId: applicationDetails.decisionOutcomeId
	});
	return applicationStages;
}

/**
 * Config object for the stages of an S62A application, including the template to render for each stage and any conditions for displaying the stage.
 */
function resolveS62AStages(applicationDetails: PublishedS62aApplication): StageItem[] {
	const DETAILS_PATH = 'views/applications/view/application-info/application-stage/details';
	return [
		{
			stageId: 'pre-application',
			stageDisplayName: 'Pre-application',
			detailsTemplate: `${DETAILS_PATH}/pre-application.njk`,
			statusOverride: STAGE_STATUS.COMPLETED // Always completed, as the application exists
		},
		{
			stageId: S62A_STAGE_ID.VALIDATION,
			stageDisplayName: getStageDisplayName(S62A_STAGE_ID.VALIDATION),
			detailsTemplate: `${DETAILS_PATH}/validation.njk`
		},
		{
			stageId: S62A_STAGE_ID.CONSULTATION,
			stageDisplayName: getStageDisplayName(S62A_STAGE_ID.CONSULTATION),
			detailsTemplate: `${DETAILS_PATH}/consultation.njk`
		},
		{
			stageId: S62A_STAGE_ID.PROCEDURE_DECISION,
			stageDisplayName: getStageDisplayName(S62A_STAGE_ID.PROCEDURE_DECISION),
			detailsTemplate: `${DETAILS_PATH}/procedure-decision.njk`
		},
		{
			stageId: S62A_STAGE_ID.WRITTEN_REPRESENTATIONS,
			stageDisplayName: getStageDisplayName(S62A_STAGE_ID.WRITTEN_REPRESENTATIONS),
			detailsTemplate: `${DETAILS_PATH}/written-representation.njk`,
			shouldDisplay: applicationDetails.procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS
		},
		{
			stageId: S62A_STAGE_ID.HEARING,
			stageDisplayName: getStageDisplayName(S62A_STAGE_ID.HEARING),
			detailsTemplate: `${DETAILS_PATH}/hearing.njk`,
			shouldDisplay: applicationDetails.procedureId === APPLICATION_PROCEDURE_ID.HEARING
		},
		{
			stageId: S62A_STAGE_ID.DECISION,
			stageDisplayName: 'Reporting and decision',
			detailsTemplate: `${DETAILS_PATH}/reporting-and-decision.njk`
		},
		{
			stageId: 'post-decision',
			stageDisplayName: 'Post-decision',
			detailsTemplate: `${DETAILS_PATH}/post-decision.njk`,
			hasStatus: false // No status for post-decision, as it is after the decision has been made
		}
	];
}

/**
 * Returns the display name for a given stageId, or an empty string if not found.
 */
function getStageDisplayName(stageId: string): string {
	return S62A_STAGES.find((stage) => stage.id === stageId)?.displayName ?? '';
}

/**
 * Resolves the stageId for applications that have a procedure and stage mismatch, which can occur when the application is in the wrong stage for its procedure.
 * And pre-application that is in the S62A_STAGES list
 */
function getStageId(applicationDetails: PublishedS62aApplication, stages: StageItem[]): string {
	if (applicationDetails.procedureId) {
		const hasProcedureAndStageMismatch =
			(applicationDetails.procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS &&
				applicationDetails.stageId === S62A_STAGE_ID.HEARING) ||
			(applicationDetails.procedureId === APPLICATION_PROCEDURE_ID.HEARING &&
				applicationDetails.stageId === S62A_STAGE_ID.WRITTEN_REPRESENTATIONS);
		if (hasProcedureAndStageMismatch) {
			return S62A_STAGE_ID.PROCEDURE_DECISION;
		}
	}

	const stage = stages.find((stage) => stage.stageId === applicationDetails.stageId);
	if (stage?.shouldDisplay === false) {
		return S62A_STAGE_ID.PROCEDURE_DECISION;
	}
	return stage?.stageId ?? 'pre-application';
}

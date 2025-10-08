import {
	APPLICATION_PROCEDURE,
	APPLICATION_STAGE,
	APPLICATION_STAGE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';

export function buildApplicationStages(crownDevelopment) {
	const applicableStageIds = [
		APPLICATION_STAGE_ID.ACCEPTANCE,
		APPLICATION_STAGE_ID.CONSULTATION,
		APPLICATION_STAGE_ID.PROCEDURE_DECISION
	];
	if (crownDevelopment.procedureId && !applicableStageIds.includes(crownDevelopment.stageId)) {
		const procedure = APPLICATION_PROCEDURE.find((procedure) => procedure.id === crownDevelopment.procedureId);
		const procedureStage = APPLICATION_STAGE.find((stage) => stage.displayName === procedure.displayName).id;
		applicableStageIds.push(procedureStage);
	}
	applicableStageIds.push(APPLICATION_STAGE_ID.DECISION);

	const currentStageIndex = applicableStageIds.indexOf(crownDevelopment.stageId);
	const hasOutcome = Boolean(crownDevelopment.decisionOutcomeId);
	const coreStages = formatCoreStages(crownDevelopment, applicableStageIds, currentStageIndex, hasOutcome);
	const formattedPreApplicationStage = {
		stageDisplayName: 'Pre-application',
		stageId: 'pre-application',
		status: 'Completed',
		isCurrentStage: false
	};
	const formattedPostDecisionStage = {
		stageDisplayName: 'Post decision',
		stageId: 'post-decision',
		status: hasOutcome ? undefined : 'Not started', // post-decision stage has no status if the application has an outcome
		isCurrentStage: hasOutcome
	};

	return [formattedPreApplicationStage, ...coreStages, formattedPostDecisionStage];
}

export function getCurrentStage(formattedApplicationStages) {
	return formattedApplicationStages.find((stage) => stage.isCurrentStage);
}

function formatCoreStages(crownDevelopment, applicableStageIds, currentStageIndex, hasOutcome) {
	return applicableStageIds.map((stageId, index) => {
		return {
			stageDisplayName: APPLICATION_STAGE.find((stage) => stage.id === stageId)?.displayName || 'Not set',
			stageId: stageId,
			status:
				index < currentStageIndex || hasOutcome
					? 'Completed'
					: index === currentStageIndex && !hasOutcome
						? 'In progress'
						: 'Not started',
			isCurrentStage: index === currentStageIndex && !hasOutcome
		};
	});
}

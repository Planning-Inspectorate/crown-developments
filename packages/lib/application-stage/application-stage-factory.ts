import { ApplicationStageEntity, STAGE_STATUS, type StageStatus } from './stage-entity.ts';

interface StageBase {
	stageId: string;
	stageDisplayName: string;
	detailsTemplate: string;
}
export interface StageItem extends StageBase {
	shouldDisplay?: boolean;
	statusOverride?: StageStatus;
	hasStatus?: boolean;
}

export interface ApplicationStageInput {
	stageId: string | null;
	decisionOutcomeId?: string | null;
}

export class ApplicationStageFactory {
	private readonly _stages: ApplicationStageEntity[];

	constructor(stageItems: StageItem[], applicationStageInput: ApplicationStageInput) {
		this._stages = this.build(stageItems, applicationStageInput);
	}

	get stages(): ApplicationStageEntity[] {
		return this._stages;
	}

	getCurrentStage(): ApplicationStageEntity | undefined {
		return this._stages.find((s) => s.isCurrentStage);
	}

	private build(stageItems: StageItem[], input: ApplicationStageInput): ApplicationStageEntity[] {
		const visible = stageItems.filter((s) => s.shouldDisplay !== false);
		const currentIndex = visible.findIndex((s) => s.stageId === input.stageId);
		const hasOutcome = Boolean(input.decisionOutcomeId);

		return visible.map(
			(stage, index) =>
				new ApplicationStageEntity({
					stageId: stage.stageId,
					stageDisplayName: stage.stageDisplayName,
					detailsTemplate: stage.detailsTemplate,
					status: this.statusFor(stage, index, currentIndex, hasOutcome),
					isCurrentStage: (index === currentIndex && !hasOutcome) || (index === visible.length - 1 && hasOutcome)
				})
		);
	}

	private statusFor(
		stage: StageItem,
		index: number,
		currentIndex: number,
		hasOutcome: boolean
	): StageStatus | undefined {
		if (stage.statusOverride !== undefined) return stage.statusOverride;
		// Informational stages never show a status tag — not even once a decision outcome exists.
		if (stage.hasStatus === false) return undefined;
		if (index < currentIndex || hasOutcome) return STAGE_STATUS.COMPLETED;
		if (index === currentIndex && !hasOutcome) return STAGE_STATUS.IN_PROGRESS;
		return STAGE_STATUS.NOT_STARTED;
	}
}

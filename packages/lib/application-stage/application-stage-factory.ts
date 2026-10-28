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
	decisionDate?: Date | null;
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
		// A decision needs both an outcome and a date; with only one, the stage field decides
		const isDecided = Boolean(input.decisionOutcomeId) && Boolean(input.decisionDate);

		return visible.map(
			(stage, index) =>
				new ApplicationStageEntity({
					stageId: stage.stageId,
					stageDisplayName: stage.stageDisplayName,
					detailsTemplate: stage.detailsTemplate,
					status: this.statusFor(stage, index, currentIndex, isDecided),
					isCurrentStage: (index === currentIndex && !isDecided) || (index === visible.length - 1 && isDecided)
				})
		);
	}

	private statusFor(
		stage: StageItem,
		index: number,
		currentIndex: number,
		isDecided: boolean
	): StageStatus | undefined {
		if (stage.statusOverride !== undefined) return stage.statusOverride;
		// Informational stages never show a status tag — not even once a decision is made.
		if (stage.hasStatus === false) return undefined;
		if (index < currentIndex || isDecided) return STAGE_STATUS.COMPLETED;
		if (index === currentIndex && !isDecided) return STAGE_STATUS.IN_PROGRESS;
		return STAGE_STATUS.NOT_STARTED;
	}
}

export const STAGE_STATUS = Object.freeze({
	COMPLETED: 'Completed',
	IN_PROGRESS: 'In progress',
	NOT_STARTED: 'Not started'
});

export type StageStatus = (typeof STAGE_STATUS)[keyof typeof STAGE_STATUS];

export interface StageEntityProps {
	stageId: string;
	stageDisplayName: string;
	detailsTemplate: string;
	status: StageStatus | undefined;
	isCurrentStage: boolean;
}

export class ApplicationStageEntity implements StageEntityProps {
	stageId: string;
	stageDisplayName: string;
	detailsTemplate: string;
	status: StageStatus | undefined;
	isCurrentStage: boolean;

	constructor(stageEntityProps: StageEntityProps) {
		this.stageId = stageEntityProps.stageId;
		this.stageDisplayName = stageEntityProps.stageDisplayName;
		this.status = stageEntityProps.status;
		this.isCurrentStage = stageEntityProps.isCurrentStage;
		this.detailsTemplate = stageEntityProps.detailsTemplate;
	}

	get hasStatus(): boolean {
		return this.status !== undefined;
	}

	get tagClass(): string {
		switch (this.status) {
			case STAGE_STATUS.COMPLETED:
				return 'govuk-tag--green';
			case STAGE_STATUS.IN_PROGRESS:
				return 'govuk-tag--yellow';
			case STAGE_STATUS.NOT_STARTED:
				return 'govuk-tag--grey';
			default:
				return '';
		}
	}
}

import { describe, it } from 'node:test';
import { ApplicationStageFactory, type StageItem } from './application-stage-factory.ts';
import assert from 'node:assert';
import { STAGE_STATUS } from './stage-entity.ts';

const baseStageItems: StageItem[] = [
	{ stageId: 'stage-1', stageDisplayName: 'Stage 1', detailsTemplate: 'stage-1-template' },
	{ stageId: 'stage-2', stageDisplayName: 'Stage 2', detailsTemplate: 'stage-2-template' },
	{ stageId: 'stage-3', stageDisplayName: 'Stage 3', detailsTemplate: 'stage-3-template' }
];

describe('ApplicationStageFactory', () => {
	it('should derive statuses relative to the current stage', () => {
		const { stages } = new ApplicationStageFactory(baseStageItems, { stageId: 'stage-2' });
		assert.strictEqual(stages[0].status, STAGE_STATUS.COMPLETED);
		assert.strictEqual(stages[1].status, STAGE_STATUS.IN_PROGRESS);
		assert.strictEqual(stages[2].status, STAGE_STATUS.NOT_STARTED);
	});

	it('should mark the matching stage as current', () => {
		const factory = new ApplicationStageFactory(baseStageItems, { stageId: 'stage-2' });
		assert.strictEqual(factory.getCurrentStage()?.stageId, 'stage-2');
	});

	it('should mark the last stage as current if there is a decision outcome and date and all previous as completed', () => {
		const factory = new ApplicationStageFactory(baseStageItems, {
			stageId: 'stage-2',
			decisionOutcomeId: 'outcome-1',
			decisionDate: new Date('2026-10-01')
		});
		assert.strictEqual(factory.getCurrentStage()?.stageId, 'stage-3');
	});

	it('should follow the stage if there is a decision outcome but no decision date', () => {
		const factory = new ApplicationStageFactory(baseStageItems, { stageId: 'stage-2', decisionOutcomeId: 'outcome-1' });
		assert.strictEqual(factory.getCurrentStage()?.stageId, 'stage-2');
		assert.strictEqual(factory.stages[2].status, STAGE_STATUS.NOT_STARTED);
	});

	it('should follow the stage if there is a decision date but no decision outcome', () => {
		const factory = new ApplicationStageFactory(baseStageItems, {
			stageId: 'stage-2',
			decisionDate: new Date('2026-10-01')
		});
		assert.strictEqual(factory.getCurrentStage()?.stageId, 'stage-2');
		assert.strictEqual(factory.stages[2].status, STAGE_STATUS.NOT_STARTED);
	});

	it('should filter out stages with shouldDisplay set to false', () => {
		const items: StageItem[] = [
			...baseStageItems,
			{ stageId: 'hidden', stageDisplayName: 'Hidden Stage', detailsTemplate: 'hidden-template', shouldDisplay: false }
		];
		const { stages } = new ApplicationStageFactory(items, { stageId: 'stage-1' });
		assert.strictEqual(stages.length, 3);
		assert.ok(!stages.some((s) => s.stageId === 'hidden'));
	});

	it('should allow stages to have no status if hasStatus is false', () => {
		const items: StageItem[] = [{ ...baseStageItems[0], hasStatus: false }, baseStageItems[1]];
		const { stages } = new ApplicationStageFactory(items, { stageId: 'stage-2' });
		assert.strictEqual(stages[0].status, undefined);
	});

	it('should respect statusOverride if provided', () => {
		const stageItemsWithOverride: StageItem[] = [
			{
				stageId: 'stage-1',
				stageDisplayName: 'Stage 1',
				detailsTemplate: 'stage-1-template',
				statusOverride: STAGE_STATUS.NOT_STARTED
			},
			{ stageId: 'stage-2', stageDisplayName: 'Stage 2', detailsTemplate: 'stage-2-template' },
			{ stageId: 'stage-3', stageDisplayName: 'Stage 3', detailsTemplate: 'stage-3-template' }
		];
		const { stages } = new ApplicationStageFactory(stageItemsWithOverride, { stageId: 'stage-2' });
		assert.strictEqual(stages[0].status, STAGE_STATUS.NOT_STARTED);
		assert.strictEqual(stages[1].status, STAGE_STATUS.IN_PROGRESS);
		assert.strictEqual(stages[2].status, STAGE_STATUS.NOT_STARTED);
	});

	it('should return undefined current stage when stageId matches nothing and no outcome', () => {
		const factory = new ApplicationStageFactory(baseStageItems, { stageId: 'nope' });
		assert.strictEqual(factory.getCurrentStage(), undefined);
		assert.ok(factory.stages.every((s) => s.status === STAGE_STATUS.NOT_STARTED));
	});

	it('should handle empty stage items gracefully', () => {
		const factory = new ApplicationStageFactory([], { stageId: 'stage-1' });
		assert.strictEqual(factory.stages.length, 0);
		assert.strictEqual(factory.getCurrentStage(), undefined);
	});

	it('should keep informational stages (hasStatus:false) status-less even once decided', () => {
		const items: StageItem[] = [
			{ ...baseStageItems[0], hasStatus: false }, // informational stage
			baseStageItems[1],
			baseStageItems[2]
		];
		const { stages } = new ApplicationStageFactory(items, {
			stageId: 'stage-1',
			decisionOutcomeId: 'outcome-1',
			decisionDate: new Date('2026-10-01')
		});

		assert.strictEqual(stages[0].status, undefined); // informational → no tag
		assert.strictEqual(stages[1].status, STAGE_STATUS.COMPLETED); // a decision completes the rest
		assert.strictEqual(stages[2].status, STAGE_STATUS.COMPLETED);
	});
});

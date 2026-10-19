import { describe, it } from 'node:test';
import { ApplicationStageEntity, STAGE_STATUS } from './stage-entity.ts';
import assert from 'node:assert';

const baseProps = {
	stageId: 'stage-id',
	stageDisplayName: 'Stage Display Name',
	detailsTemplate: 'details-template',
	isCurrentStage: false,
	status: STAGE_STATUS.NOT_STARTED
};

describe('ApplicationStageEntity', () => {
	describe('constructor', () => {
		it('should map all props onto the instance', () => {
			const entity = new ApplicationStageEntity(baseProps);
			assert.strictEqual(entity.stageId, 'stage-id');
			assert.strictEqual(entity.stageDisplayName, 'Stage Display Name');
			assert.strictEqual(entity.detailsTemplate, 'details-template');
			assert.strictEqual(entity.isCurrentStage, false);
			assert.strictEqual(entity.status, STAGE_STATUS.NOT_STARTED);
		});

		it('should allow status to be undefined', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: undefined });
			assert.strictEqual(entity.status, undefined);
		});
	});

	describe('hasStatus', () => {
		it('should return true if status is defined', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: STAGE_STATUS.COMPLETED });
			assert.strictEqual(entity.hasStatus, true);
		});

		it('should return false if status is undefined', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: undefined });
			assert.strictEqual(entity.hasStatus, false);
		});
	});

	describe('tagClass', () => {
		it('should return green for Completed', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: STAGE_STATUS.COMPLETED });
			assert.strictEqual(entity.tagClass, 'govuk-tag--green');
		});

		it('should return yellow for In progress', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: STAGE_STATUS.IN_PROGRESS });
			assert.strictEqual(entity.tagClass, 'govuk-tag--yellow');
		});

		it('should return grey for Not started', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: STAGE_STATUS.NOT_STARTED });
			assert.strictEqual(entity.tagClass, 'govuk-tag--grey');
		});

		it('should return empty string for undefined status', () => {
			const entity = new ApplicationStageEntity({ ...baseProps, status: undefined });
			assert.strictEqual(entity.tagClass, '');
		});
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildApplicationStages } from './controller.js';

describe('applicableStageIds', () => {
	describe('before procedure choice', () => {
		const testCases = [
			{
				crownDevelopment: { stageId: 'acceptance', procedureId: null },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'In progress', isCurrentStage: true },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Not started', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Not started',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Not started', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			},
			{
				crownDevelopment: { stageId: 'consultation', procedureId: null },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'In progress', isCurrentStage: true },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Not started',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Not started', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			},
			{
				crownDevelopment: { stageId: 'procedure-decision', procedureId: null },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Completed', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'In progress',
						isCurrentStage: true
					},
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Not started', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			}
		];
		testCases.forEach(({ crownDevelopment, expectedStages }) => {
			it(`should return correct stages for stageId: ${crownDevelopment.stageId}`, () => {
				const stages = buildApplicationStages(crownDevelopment);
				assert.deepStrictEqual(stages, expectedStages);
			});
		});
	});
	describe('during procedure', () => {
		const baseProcedureTests = [
			{
				crownDevelopment: { stageId: 'inquiry', procedureId: 'inquiry' },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Completed', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Inquiry', stageId: 'inquiry', status: 'In progress', isCurrentStage: true },
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Not started', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			},
			{
				crownDevelopment: { stageId: 'hearing', procedureId: 'hearing' },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Completed', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Hearing', stageId: 'hearing', status: 'In progress', isCurrentStage: true },
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Not started', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			},
			{
				crownDevelopment: { stageId: 'written-representations', procedureId: 'written-reps' },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Completed', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Completed',
						isCurrentStage: false
					},
					{
						stageDisplayName: 'Written representations',
						stageId: 'written-representations',
						status: 'In progress',
						isCurrentStage: true
					},
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Not started', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			}
		];
		baseProcedureTests.forEach(({ crownDevelopment, expectedStages }) => {
			it(`should return correct stages for procedureId: ${crownDevelopment.procedureId}`, () => {
				const stages = buildApplicationStages(crownDevelopment);
				assert.deepStrictEqual(stages, expectedStages);
			});
		});
	});
	describe('after procedure decision', () => {
		const testCases = [
			{
				crownDevelopment: { stageId: 'decision', procedureId: 'inquiry', decisionOutcomeId: null },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Completed', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Inquiry', stageId: 'inquiry', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'In progress', isCurrentStage: true },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: 'Not started', isCurrentStage: false }
				]
			},
			{
				crownDevelopment: { stageId: 'decision', procedureId: 'inquiry', decisionOutcomeId: 'outcome1' },
				expectedStages: [
					{
						stageDisplayName: 'Pre-application',
						stageId: 'pre-application',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Accepted', stageId: 'acceptance', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Consultation', stageId: 'consultation', status: 'Completed', isCurrentStage: false },
					{
						stageDisplayName: 'Procedure choice',
						stageId: 'procedure-decision',
						status: 'Completed',
						isCurrentStage: false
					},
					{ stageDisplayName: 'Inquiry', stageId: 'inquiry', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Final decision', stageId: 'decision', status: 'Completed', isCurrentStage: false },
					{ stageDisplayName: 'Post decision', stageId: 'post-decision', status: undefined, isCurrentStage: true } // Given that post-decision is not an ongoing state the status disappears once we reach it.
				]
			}
		];
		testCases.forEach(({ crownDevelopment, expectedStages }) => {
			it(`should return correct stages for stageId: ${crownDevelopment.stageId} with decisionOutcomeId: ${crownDevelopment.decisionOutcomeId}`, () => {
				const stages = buildApplicationStages(crownDevelopment);
				assert.deepStrictEqual(stages, expectedStages);
			});
		});
	});
});

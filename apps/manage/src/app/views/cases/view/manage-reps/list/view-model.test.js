import { describe, it } from 'node:test';
import { representationsToViewModel, representationToViewModel } from './view-model.js';
import assert from 'node:assert';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('view-model', () => {
	describe('representationsToViewModel', () => {
		it('should sort reps by date', () => {
			/**
			 * @type {import('@prisma/client').Prisma.RepresentationCreateInput[]}
			 */
			const reps = [
				{
					reference: 'abc-123',
					submittedDate: new Date('2025-02-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				},
				{
					reference: 'abc-124',
					submittedDate: new Date('2025-05-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				},
				{
					reference: 'abc-125',
					submittedDate: new Date('2025-01-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				}
			];

			const got = representationsToViewModel(reps);
			assert.strictEqual(got.reps[0].reference, 'abc-125');
			assert.strictEqual(got.reps[1].reference, 'abc-123');
			assert.strictEqual(got.reps[2].reference, 'abc-124');
		});
		it('should group reps by status', () => {
			/**
			 * @type {import('@prisma/client').Prisma.RepresentationCreateInput[]}
			 */
			const reps = [
				{
					reference: 'abc-123',
					submittedDate: new Date('2025-02-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				},
				{
					reference: 'abc-124',
					submittedDate: new Date('2025-05-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.REJECTED
				},
				{
					reference: 'abc-125',
					submittedDate: new Date('2025-01-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				},
				{
					reference: 'abc-126',
					submittedDate: new Date('2025-01-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
				},
				{
					reference: 'abc-127',
					submittedDate: new Date('2025-01-27T12:15:59Z'),
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				}
			];

			const got = representationsToViewModel(reps);
			assert.strictEqual(got.reps.length, 5);
		});
	});
	describe('representationToViewModel', () => {
		const tests = [
			{
				rep: {
					reference: 'abc-123',
					submittedDate: undefined
				},
				viewModel: {
					reference: 'abc-123',
					submittedDate: '',
					submittedDateSortableValue: '',
					submittedByFullName: '',
					review: false,
					status: undefined
				}
			},
			{
				rep: {
					reference: 'abc-123-all-fields',
					statusId: 'awaiting-review',
					Status: {
						id: 'awaiting-review',
						displayName: 'Awaiting Review'
					},
					submittedDate: new Date('2025-02-27T12:15:59Z'),
					SubmittedByContact: {
						firstName: 'Mandalorian',
						lastName: 'Skywalker'
					}
				},
				viewModel: {
					reference: 'abc-123-all-fields',
					submittedDate: '27 Feb 2025',
					submittedDateSortableValue: 1740658559000,
					submittedByFullName: 'Mandalorian Skywalker',
					review: true,
					status: 'Awaiting Review'
				}
			}
		];
		for (const test of tests) {
			it(`should map rep ${test.rep.reference}`, () => {
				const viewModel = representationToViewModel(test.rep);
				assert.deepStrictEqual(viewModel, test.viewModel);
			});
		}
	});
});

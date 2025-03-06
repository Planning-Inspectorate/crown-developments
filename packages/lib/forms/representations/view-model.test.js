import { describe, it } from 'node:test';
import { representationToManageViewModel } from './view-model.js';
import assert from 'node:assert';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';

describe('view-model', () => {
	describe('representationToManageViewModel', () => {
		const applicationReference = 'app/ref';
		it('should map the common fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: 'id-1'
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				...representation,
				applicationReference,
				wantsToBeHeard: 'yes',
				requiresReview: false
			});
		});
		it('should map requires review', () => {
			const representation = {
				reference: 'ref',
				statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: 'id-1'
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				...representation,
				applicationReference,
				wantsToBeHeard: 'yes',
				requiresReview: true
			});
		});
		it('should map the myself fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				comment: 'my comments',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				}
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference,
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				wantsToBeHeard: 'yes',
				myselfIsAdult: 'yes',
				myselfFullName: 'my name',
				myselfEmail: 'email@example.com',
				myselfComment: 'my comments',
				requiresReview: false
			});
		});
		it('should map the on behalf of common fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				},
				representedTypeId: 'r-id-1'
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference,
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				wantsToBeHeard: 'yes',
				representedTypeId: 'r-id-1',
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				requiresReview: false
			});
		});
		it('should map the on behalf of person fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				RepresentedContact: {
					isAdult: true,
					fullName: 'the persons name'
				},
				submittedByAgent: true,
				submittedByAgentOrgName: 'agent org'
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference,
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				wantsToBeHeard: 'yes',
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				representedIsAdult: 'yes',
				representedFullName: 'the persons name',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				requiresReview: false
			});
		});
		it('should map the on behalf of org fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				RepresentedContact: {
					fullName: 'the orgs name',
					jobTitleOrRole: 'my role'
				}
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference,
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				wantsToBeHeard: 'yes',
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				orgName: 'the orgs name',
				orgRoleName: 'my role',
				requiresReview: false
			});
		});
		it(`should map the on behalf of org don't work for fields`, () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				RepresentedContact: {
					fullName: 'the households name'
				},
				submittedByAgent: true,
				submittedByAgentOrgName: 'agent org'
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference,
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				wantsToBeHeard: 'yes',
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				representedOrgName: 'the households name',
				requiresReview: false
			});
		});
	});
});

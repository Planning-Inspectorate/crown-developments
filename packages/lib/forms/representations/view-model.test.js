import { describe, it } from 'node:test';
import { representationToManageViewModel, viewModelToRepresentationCreateInput } from './view-model.js';
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
	describe('viewModelToRepresentationCreateInput', () => {
		it('should map myself journey answers to Prisma Input', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
			const id = 'id-1';
			const reference = 'ref';
			const now = new Date();
			const mockAnswers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				myselfIsAdult: 'yes',
				myselfFullName: 'my name',
				myselfEmail: 'myemail@email.com',
				myselfComment: 'my comments'
			};
			const representationCreateInput = viewModelToRepresentationCreateInput(mockAnswers, reference, id);

			assert.deepStrictEqual(representationCreateInput, {
				reference: 'ref',
				Status: {
					connect: {
						id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
					}
				},
				Application: {
					connect: {
						id: 'id-1'
					}
				},
				submittedDate: now,
				submittedByAgent: false,
				SubmittedByContact: {
					create: {
						isAdult: true,
						fullName: 'my name',
						email: 'myemail@email.com'
					}
				},
				SubmittedFor: {
					connect: {
						id: 'myself'
					}
				},
				comment: 'my comments'
			});
		});
		it('should map on agent on behalf of a person journey answers to Prisma Input', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
			const id = 'id-1';
			const reference = 'ref';
			const now = new Date();
			const mockAnswers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterEmail: 'myemail@email.com',
				areYouAgent: true,
				agentOrgName: 'agent org',
				submitterComment: 'my comments',
				representedIsAdult: 'yes',
				representedFullName: 'represented name'
			};

			const representationCreateInput = viewModelToRepresentationCreateInput(mockAnswers, reference, id);
			assert.deepStrictEqual(representationCreateInput, {
				reference: 'ref',
				Status: {
					connect: {
						id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
					}
				},
				Application: {
					connect: {
						id: 'id-1'
					}
				},
				submittedDate: now,
				submittedByAgent: true,
				submittedByAgentOrgName: 'agent org',
				SubmittedByContact: {
					create: {
						isAdult: true,
						fullName: 'my name',
						email: 'myemail@email.com'
					}
				},
				SubmittedFor: {
					connect: {
						id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					}
				},
				comment: 'my comments',
				RepresentedType: {
					connect: {
						id: REPRESENTED_TYPE_ID.PERSON
					}
				},
				RepresentedContact: {
					create: {
						isAdult: true,
						fullName: 'represented name'
					}
				}
			});
		});
		it('should map on on behalf of an organisation they do not work for journey answers to Prisma Input', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
			const id = 'id-1';
			const reference = 'ref';
			const now = new Date();
			const mockAnswers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				submitterIsAdult: 'yes',
				areYouAgent: 'yes',
				submitterFullName: 'my name',
				submitterEmail: 'myemail@email.com',
				submitterComment: 'my comments',
				representedOrgName: 'rep org',
				agentOrgName: 'my role'
			};
			const representationCreateInput = viewModelToRepresentationCreateInput(mockAnswers, reference, id);
			assert.deepStrictEqual(representationCreateInput, {
				reference: 'ref',
				Status: {
					connect: {
						id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
					}
				},
				Application: {
					connect: {
						id: 'id-1'
					}
				},
				submittedDate: now,
				submittedByAgent: true,
				submittedByAgentOrgName: 'my role',
				SubmittedByContact: {
					create: {
						isAdult: true,
						fullName: 'my name',
						email: 'myemail@email.com'
					}
				},
				SubmittedFor: {
					connect: {
						id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					}
				},
				comment: 'my comments',
				RepresentedType: {
					connect: {
						id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR
					}
				},
				RepresentedContact: {
					create: {
						fullName: 'rep org'
					}
				}
			});
		});
		it('should map on on behalf of an organisation they work for journey answers to Prisma Input', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
			const id = 'id-1';
			const reference = 'ref';
			const now = new Date();
			const mockAnswers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				submitterIsAdult: 'yes',
				areYouAgent: 'no',
				submitterFullName: 'my name',
				submitterEmail: 'myemail@email.com',
				submitterComment: 'my comments',
				representedOrgName: 'rep org',
				orgRoleName: 'my role at org'
			};
			const representationCreateInput = viewModelToRepresentationCreateInput(mockAnswers, reference, id);
			assert.deepStrictEqual(representationCreateInput, {
				reference: 'ref',
				Status: {
					connect: {
						id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
					}
				},
				Application: {
					connect: {
						id: 'id-1'
					}
				},
				submittedDate: now,
				submittedByAgent: false,
				SubmittedByContact: {
					create: {
						isAdult: true,
						fullName: 'my name',
						email: 'myemail@email.com',
						jobTitleOrRole: 'my role at org'
					}
				},
				SubmittedFor: {
					connect: {
						id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					}
				},
				comment: 'my comments',
				RepresentedType: {
					connect: {
						id: REPRESENTED_TYPE_ID.ORGANISATION
					}
				},
				RepresentedContact: {
					create: {
						fullName: 'rep org'
					}
				}
			});
		});
		describe('should not save personal information if not over 18', () => {
			const mockAnswers = {
				representedTypeId: REPRESENTED_TYPE_ID.PERSON
			};
			const tests = [
				{
					prefix: 'represented',
					inputs: {
						representedIsAdult: 'no',
						representedFullName: 'do not save',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					},

					expected: {
						isAdult: false
					}
				},
				{
					prefix: 'represented',
					inputs: {
						representedIsAdult: 'yes',
						representedFullName: 'save',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					},
					expected: {
						isAdult: true,
						fullName: 'save'
					}
				},
				{
					prefix: 'myself',
					inputs: {
						myselfIsAdult: 'no',
						myselfFullName: 'do not save',
						myselfEmail: 'do not save email',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
					},
					expected: {
						isAdult: false
					}
				},
				{
					prefix: 'myself',
					inputs: {
						myselfIsAdult: 'yes',
						myselfFullName: 'save',
						myselfEmail: 'save email',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
					},
					expected: {
						isAdult: true,
						fullName: 'save',
						email: 'save email'
					}
				},
				{
					prefix: 'submitter',
					inputs: {
						submitterIsAdult: 'no',
						submitterFullName: 'do not save',
						submitterEmail: 'do not save email',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					},
					expected: {
						isAdult: false
					}
				},
				{
					prefix: 'submitter',
					inputs: {
						submitterIsAdult: 'yes',
						submitterFullName: 'save',
						submitterEmail: 'save email',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					},
					expected: {
						isAdult: true,
						fullName: 'save',
						email: 'save email'
					}
				}
			];
			tests.forEach(({ prefix, inputs, expected }) => {
				it(`when ${prefix + 'IsAdult'} is ${inputs[prefix + 'IsAdult']} it should${expected.isAdult ? '' : "n't"} save the name`, () => {
					const id = 'id-1';
					const reference = 'ref';
					const representationCreateInput = viewModelToRepresentationCreateInput(
						{
							...mockAnswers,
							...inputs
						},
						reference,
						id
					);
					const contactToTest =
						prefix === 'submitter' || prefix === 'myself' ? 'SubmittedByContact' : 'RepresentedContact';
					assert.deepStrictEqual(representationCreateInput[contactToTest].create, {
						...expected
					});
				});
			});
		});
	});
});

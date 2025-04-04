import { describe, it } from 'node:test';
import {
	editsToDatabaseUpdates,
	representationToManageViewModel,
	viewModelToRepresentationCreateInput
} from './view-model.js';
import assert from 'node:assert';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

/**
 * @typedef {import('./types.js').HaveYourSayManageModel} HaveYourSayManageModel
 */

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
				submittedForId: 'id-1',
				comment: 'comment one',
				commentRedacted: '███████ one',
				containsAttachments: false,
				sharePointFolderCreated: false
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				...representation,
				applicationReference,
				wantsToBeHeard: 'yes',
				requiresReview: false,
				submittedByContactId: undefined,
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: 'comment one',
				commentRedacted: '███████ one',
				containsAttachments: 'no',
				sharePointFolderCreated: 'no'
			});
		});
		it('should map requires review', () => {
			const representation = {
				reference: 'ref',
				statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: 'id-1',
				containsAttachments: false,
				sharePointFolderCreated: false
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				...representation,
				applicationReference,
				wantsToBeHeard: 'yes',
				requiresReview: true,
				submittedByContactId: undefined,
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: undefined,
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no'
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
				containsAttachments: true,
				sharePointFolderCreated: true,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com',
					contactPreferenceId: 'post',
					addressId: 'abc-123',
					Address: {
						id: 'abc-123',
						line1: '221b Baker Street',
						line2: 'apartment 2',
						townCity: 'London',
						county: 'Greater London',
						postcode: 'NW1 6XE'
					}
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

				myselfAddress: {
					id: 'abc-123',
					addressLine1: '221b Baker Street',
					addressLine2: 'apartment 2',
					townCity: 'London',
					county: 'Greater London',
					postcode: 'NW1 6XE'
				},
				myselfContactPreference: 'post',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				submittedByAddressId: 'abc-123',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'yes',
				sharePointFolderCreated: 'yes'
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
				containsAttachments: true,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com',
					contactPreferenceId: 'email'
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
				submitterContactPreference: 'email',
				submitterAddress: {},
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'yes',
				sharePointFolderCreated: 'no'
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
				containsAttachments: false,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				representedContactId: 'rep-id-1',
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
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterAddress: {},
				submitterComment: 'my comments',
				representedIsAdult: 'yes',
				representedFullName: 'the persons name',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				submittedByAddressId: undefined,
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no'
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
				containsAttachments: false,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com',
					jobTitleOrRole: 'my role'
				},
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				representedContactId: 'rep-id-1',
				RepresentedContact: {
					fullName: 'the orgs name'
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
				submittedByAddressId: undefined,
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				orgName: 'the orgs name',
				orgRoleName: 'my role',
				requiresReview: false,
				submitterAddress: {},
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no'
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
				containsAttachments: false,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					isAdult: true,
					fullName: 'my name',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				representedContactId: 'rep-id-1',
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
				submittedByAddressId: undefined,
				submitterAddress: {},
				submitterIsAdult: 'yes',
				submitterFullName: 'my name',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				representedOrgName: 'the households name',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no'
			});
		});
	});
	describe('editsToDatabaseUpdates', () => {
		it('should map representation fields', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
				wantsToBeHeard: false,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				categoryId: 'c-id-1'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.deepStrictEqual(updates, {
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
				wantsToBeHeard: false,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				categoryId: 'c-id-1'
			});
		});
		it('should not allow reference changes', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
				wantsToBeHeard: BOOLEAN_OPTIONS.NO,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				reference: 'abc-123'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.reference, undefined);
		});
		it('should map myself field edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				myselfIsAdult: BOOLEAN_OPTIONS.YES,
				myselfFullName: 'Person A',
				myselfEmail: 'some@example.email',
				myselfComment: 'my comment'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.comment, 'my comment');
			assert.ok(updates.SubmittedByContact);
			assert.strictEqual(updates.SubmittedByContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.SubmittedByContact?.create, {
				isAdult: true,
				fullName: 'Person A',
				email: 'some@example.email'
			});
		});
		it('should map submitter field edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterIsAdult: BOOLEAN_OPTIONS.YES,
				submitterFullName: 'Person A',
				submitterEmail: 'some@example.email',
				submitterComment: 'my comment'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.comment, 'my comment');
			assert.strictEqual(updates.representedTypeId, REPRESENTED_TYPE_ID.PERSON);
			assert.ok(updates.SubmittedByContact);
			assert.strictEqual(updates.SubmittedByContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.SubmittedByContact?.create, {
				isAdult: true,
				fullName: 'Person A',
				email: 'some@example.email'
			});
		});
		it('should map org field edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				orgName: 'Org One',
				orgRoleName: 'Important role here'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.ok(updates.RepresentedContact);
			assert.strictEqual(updates.RepresentedContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.RepresentedContact.upsert?.create, {
				fullName: 'Org One',
				jobTitleOrRole: 'Important role here'
			});
		});
		it('should map behalf of person edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				representedIsAdult: BOOLEAN_OPTIONS.YES,
				representedFullName: 'Person B',
				isAgent: BOOLEAN_OPTIONS.YES,
				agentOrgName: 'Consultancy One'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.submittedByAgent, true);
			assert.strictEqual(updates.submittedByAgentOrgName, 'Consultancy One');
			assert.ok(updates.RepresentedContact);
			assert.strictEqual(updates.RepresentedContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.RepresentedContact.upsert?.create, {
				fullName: 'Person B',
				isAdult: true
			});
		});
		it('should map behalf of org not work for edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				representedOrgName: 'Household A',
				isAgent: BOOLEAN_OPTIONS.YES,
				agentOrgName: 'Consultancy One'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.submittedByAgent, true);
			assert.strictEqual(updates.submittedByAgentOrgName, 'Consultancy One');
			assert.ok(updates.RepresentedContact);
			assert.strictEqual(updates.RepresentedContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.RepresentedContact.upsert?.create, {
				fullName: 'Household A'
			});
		});
		it('should include represented contact id', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				representedOrgName: 'Household A'
			};
			const viewModel = {
				representedContactId: 'rep-id-1'
			};
			const updates = editsToDatabaseUpdates(edits, viewModel);
			assert.ok(updates);
			assert.ok(updates.RepresentedContact);
			assert.deepStrictEqual(updates.RepresentedContact.upsert?.where, {
				id: 'rep-id-1'
			});
		});
	});
	describe('viewModelToRepresentationCreateInput', () => {
		describe('have-your-say-journey journey answers', () => {
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
							email: 'myemail@email.com',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							email: 'myemail@email.com',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							email: 'myemail@email.com',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							jobTitleOrRole: 'my role at org',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							myselfEmail: 'save email',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
						},
						expected: {
							isAdult: false,
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
						}
					},
					{
						prefix: 'submitter',
						inputs: {
							submitterIsAdult: 'no',
							submitterFullName: 'do not save',
							submitterEmail: 'save email',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
						},
						expected: {
							isAdult: false,
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
		describe('add-representation journey answers', () => {
			it('should map myself journey answers to Prisma Input', (context) => {
				context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
				const id = 'id-1';
				const reference = 'ref';
				const now = new Date();
				const mockAnswers = {
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					myselfIsAdult: 'yes',
					myselfFullName: 'my name',
					myselfContactPreference: 'email',
					myselfEmail: 'myemail@email.com',
					myselfComment: 'my comments',
					myselfHearingPreference: 'yes'
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
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
						}
					},
					SubmittedFor: {
						connect: {
							id: 'myself'
						}
					},
					comment: 'my comments',
					wantsToBeHeard: true
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
					submitterContactPreference: 'post',
					submitterAddress: {
						addressLine1: '221b Baker Street',
						addressLine2: 'apartment 2',
						townCity: 'London',
						county: 'Greater London',
						postcode: 'NW1 6XE'
					},
					areYouAgent: true,
					agentOrgName: 'agent org',
					submitterComment: 'my comments',
					representedIsAdult: 'yes',
					representedFullName: 'represented name',
					submitterHearingPreference: 'no'
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
							email: undefined,
							ContactPreference: {
								connect: { id: 'post' }
							},
							Address: {
								create: {
									line1: '221b Baker Street',
									line2: 'apartment 2',
									townCity: 'London',
									county: 'Greater London',
									postcode: 'NW1 6XE'
								}
							}
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
					},
					wantsToBeHeard: false
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
					submitterContactPreference: 'email',
					submitterEmail: 'myemail@email.com',
					submitterComment: 'my comments',
					representedOrgName: 'rep org',
					agentOrgName: 'my role',
					submitterHearingPreference: 'no'
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
							email: 'myemail@email.com',
							ContactPreference: { connect: { id: 'email' } }
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
					},
					wantsToBeHeard: false
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
					submitterContactPreference: 'email',
					submitterEmail: 'myemail@email.com',
					submitterComment: 'my comments',
					representedOrgName: 'rep org',
					orgRoleName: 'my role at org',
					submitterHearingPreference: 'no',
					wantsToBeHeard: false
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
							jobTitleOrRole: 'my role at org',
							ContactPreference: { connect: { id: 'email' } }
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
					},
					wantsToBeHeard: false
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
							myselfEmail: 'save email',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
						},
						expected: {
							isAdult: false,
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
						}
					},
					{
						prefix: 'submitter',
						inputs: {
							submitterIsAdult: 'no',
							submitterFullName: 'do not save',
							submitterEmail: 'save email',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
						},
						expected: {
							isAdult: false,
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
							email: 'save email',
							ContactPreference: {
								connect: {
									id: 'email'
								}
							}
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
});

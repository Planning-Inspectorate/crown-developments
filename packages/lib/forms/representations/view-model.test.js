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
				submittedForId: 'id-1',
				comment: 'comment one',
				commentStatus: REPRESENTATION_STATUS_ID.ACCEPTED,
				commentRedacted: '███████ one',
				containsAttachments: false,
				sharePointFolderCreated: false
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				...representation,
				applicationReference,
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
				submittedForId: 'id-1',
				containsAttachments: false,
				sharePointFolderCreated: false
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				...representation,
				applicationReference,
				requiresReview: true,
				submittedByContactId: undefined,
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: undefined,
				commentStatus: undefined,
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
				commentStatus: REPRESENTATION_STATUS_ID.REJECTED,
				containsAttachments: true,
				sharePointFolderCreated: true,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					firstName: 'firstName',
					lastName: 'lastName',
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
				myselfHearingPreference: 'yes',
				myselfFirstName: 'firstName',
				myselfLastName: 'lastName',
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
				myselfContainsAttachments: 'yes',
				myselfAttachments: undefined,
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				submittedByAddressId: 'abc-123',
				comment: 'my comments',
				commentStatus: 'rejected',
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
				commentStatus: REPRESENTATION_STATUS_ID.ACCEPTED,
				containsAttachments: true,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					firstName: 'firstName',
					lastName: 'lastName',
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
				representedTypeId: 'r-id-1',
				submitterHearingPreference: 'yes',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: 'email',
				submitterAddress: {},
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				submitterContainsAttachments: 'yes',
				submitterAttachments: undefined,
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: 'my comments',
				commentStatus: 'accepted',
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
				commentStatus: REPRESENTATION_STATUS_ID.ACCEPTED,
				containsAttachments: false,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					firstName: 'firstName',
					lastName: 'lastName',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				representedContactId: 'rep-id-1',
				RepresentedContact: {
					firstName: 'represented firstName',
					lastName: 'represented lastName'
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
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterHearingPreference: 'yes',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterAddress: {},
				submitterComment: 'my comments',
				submitterContainsAttachments: 'no',
				submitterAttachments: undefined,
				representedFirstName: 'represented firstName',
				representedLastName: 'represented lastName',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				submittedByAddressId: undefined,
				comment: 'my comments',
				commentStatus: 'accepted',
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
				commentStatus: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
				containsAttachments: false,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					firstName: 'firstName',
					lastName: 'lastName',
					email: 'email@example.com',
					jobTitleOrRole: 'my role'
				},
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				representedContactId: 'rep-id-1',
				RepresentedContact: {
					orgName: 'the orgs name'
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
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				submitterHearingPreference: 'yes',
				submittedByAddressId: undefined,
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				submitterContainsAttachments: 'no',
				submitterAttachments: undefined,
				orgName: 'the orgs name',
				orgRoleName: 'my role',
				requiresReview: false,
				submitterAddress: {},
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentStatus: 'awaiting-review',
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
				commentStatus: REPRESENTATION_STATUS_ID.ACCEPTED,
				containsAttachments: false,
				sharePointFolderCreated: false,
				submittedByContactId: 'sub-id-1',
				SubmittedByContact: {
					firstName: 'firstName',
					lastName: 'lastName',
					email: 'email@example.com'
				},
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				representedContactId: 'rep-id-1',
				RepresentedContact: {
					orgName: 'Represented orgName'
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
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				submittedByAddressId: undefined,
				submitterAddress: {},
				submitterHearingPreference: 'yes',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				submitterContainsAttachments: 'no',
				submitterAttachments: undefined,
				isAgent: 'yes',
				agentOrgName: 'agent org',
				representedOrgName: 'Represented orgName',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentStatus: 'accepted',
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
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				categoryId: 'c-id-1'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.deepStrictEqual(updates, {
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
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
				myselfFirstName: 'firstName',
				myselfLastName: 'lastName',
				myselfEmail: 'some@example.email',
				myselfComment: 'my comment',
				myselfContainsAttachments: 'no',
				myselfHearingPreference: 'yes'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.comment, 'my comment');
			assert.strictEqual(updates.containsAttachments, false);
			assert.strictEqual(updates.wantsToBeHeard, true);
			assert.ok(updates.SubmittedByContact);
			assert.strictEqual(updates.SubmittedByContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.SubmittedByContact?.create, {
				firstName: 'firstName',
				lastName: 'lastName',
				email: 'some@example.email'
			});
		});
		it('should map submitter field edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterEmail: 'some@example.email',
				submitterComment: 'my comment',
				submitterContainsAttachments: 'yes',
				submitterHearingPreference: 'no'
			};
			const updates = editsToDatabaseUpdates(edits, {});
			assert.ok(updates);
			assert.strictEqual(updates.comment, 'my comment');
			assert.strictEqual(updates.containsAttachments, true);
			assert.strictEqual(updates.wantsToBeHeard, false);
			assert.strictEqual(updates.representedTypeId, REPRESENTED_TYPE_ID.PERSON);
			assert.ok(updates.SubmittedByContact);
			assert.strictEqual(updates.SubmittedByContact.upsert?.where, undefined);
			assert.deepStrictEqual(updates.SubmittedByContact?.create, {
				firstName: 'firstName',
				lastName: 'lastName',
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
				orgName: 'Org One'
			});
			assert.deepStrictEqual(updates.SubmittedByContact?.create, {
				jobTitleOrRole: 'Important role here'
			});
		});
		it('should map behalf of person edits', () => {
			/** @type {HaveYourSayManageModel} */
			const edits = {
				representedFirstName: 'firstName',
				representedLastName: 'lastName',
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
				firstName: 'firstName',
				lastName: 'lastName'
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
				orgName: 'Household A'
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
					myselfFirstName: 'firstName',
					myselfLastName: 'lastName',
					myselfEmail: 'myemail@email.com',
					myselfComment: 'my comments',
					myselfContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: false,
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review'
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
					submitterFirstName: 'firstName',
					submitterLastName: 'lastName',
					submitterEmail: 'myemail@email.com',
					isAgent: true,
					agentOrgName: 'agent org',
					submitterComment: 'my comments',
					representedFirstName: 'firstName',
					representedLastName: 'lastName',
					submitterContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: true,
					submittedByAgentOrgName: 'agent org',
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
					RepresentedType: {
						connect: {
							id: REPRESENTED_TYPE_ID.PERSON
						}
					},
					RepresentedContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName'
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
					isAgent: 'yes',
					submitterFirstName: 'firstName',
					submitterLastName: 'lastName',
					submitterEmail: 'myemail@email.com',
					submitterComment: 'my comments',
					representedOrgName: 'rep org',
					agentOrgName: 'my role',
					categoryId: 'consultees',
					submitterContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'consultees'
						}
					},
					submittedDate: now,
					submittedByAgent: true,
					submittedByAgentOrgName: 'my role',
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
					RepresentedType: {
						connect: {
							id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR
						}
					},
					RepresentedContact: {
						create: {
							orgName: 'rep org'
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
					isAgent: 'no',
					submitterFirstName: 'firstName',
					submitterLastName: 'lastName',
					submitterEmail: 'myemail@email.com',
					submitterComment: 'my comments',
					representedOrgName: 'rep org',
					orgRoleName: 'my role at org',
					submitterContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: false,
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
					RepresentedType: {
						connect: {
							id: REPRESENTED_TYPE_ID.ORGANISATION
						}
					},
					RepresentedContact: {
						create: {
							orgName: 'rep org'
						}
					}
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
					myselfFirstName: 'firstName',
					myselfLastName: 'lastName',
					myselfContactPreference: 'email',
					myselfEmail: 'myemail@email.com',
					myselfComment: 'my comments',
					myselfHearingPreference: 'yes',
					myselfContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: false,
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
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
					submitterFirstName: 'firstName',
					submitterLastName: 'lastName',
					submitterContactPreference: 'post',
					submitterAddress: {
						addressLine1: '221b Baker Street',
						addressLine2: 'apartment 2',
						townCity: 'London',
						county: 'Greater London',
						postcode: 'NW1 6XE'
					},
					isAgent: true,
					agentOrgName: 'agent org',
					submitterComment: 'my comments',
					representedFirstName: 'represented firstName',
					representedLastName: 'represented lastName',
					submitterHearingPreference: 'no',
					submitterContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: true,
					submittedByAgentOrgName: 'agent org',
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
					RepresentedType: {
						connect: {
							id: REPRESENTED_TYPE_ID.PERSON
						}
					},
					RepresentedContact: {
						create: {
							firstName: 'represented firstName',
							lastName: 'represented lastName'
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
					isAgent: 'yes',
					submitterFirstName: 'firstName',
					submitterLastName: 'lastName',
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: true,
					submittedByAgentOrgName: 'my role',
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
					RepresentedType: {
						connect: {
							id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR
						}
					},
					RepresentedContact: {
						create: {
							orgName: 'rep org'
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
					isAgent: 'no',
					submitterFirstName: 'firstName',
					submitterLastName: 'lastName',
					submitterContactPreference: 'email',
					submitterEmail: 'myemail@email.com',
					submitterComment: 'my comments',
					representedOrgName: 'rep org',
					orgRoleName: 'my role at org',
					submitterHearingPreference: 'no',
					wantsToBeHeard: false,
					submitterContainsAttachments: 'no'
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
					Category: {
						connect: {
							id: 'interested-parties'
						}
					},
					submittedDate: now,
					submittedByAgent: false,
					SubmittedByContact: {
						create: {
							firstName: 'firstName',
							lastName: 'lastName',
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
					containsAttachments: false,
					commentStatus: 'awaiting-review',
					RepresentedType: {
						connect: {
							id: REPRESENTED_TYPE_ID.ORGANISATION
						}
					},
					RepresentedContact: {
						create: {
							orgName: 'rep org'
						}
					},
					wantsToBeHeard: false
				});
			});
		});
	});
});

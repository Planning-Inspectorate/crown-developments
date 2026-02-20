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
	REPRESENTED_TYPE_ID,
	RECEIVED_METHOD_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

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
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
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
				requiresReview: false,
				submittedByContactId: undefined,
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: 'comment one',
				commentRedacted: '███████ one',
				containsAttachments: 'no',
				sharePointFolderCreated: 'no',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map requires review', () => {
			const representation = {
				reference: 'ref',
				statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: undefined,
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
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map the myself fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: undefined,
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				comment: 'my comments',
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
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: undefined,
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
				myselfRedactedAttachments: [],
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				submittedByAddressId: 'abc-123',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'yes',
				sharePointFolderCreated: 'yes',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map the myself fields when contains attachments and redacted attachments', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				comment: 'my comments',
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
				},
				Attachments: [
					{
						itemId: 'file-1',
						fileName: 'file1.pdf',
						size: 12345,
						redactedItemId: 'redacted-file-1',
						redactedFileName: 'redacted-file1.pdf'
					},
					{
						itemId: 'file-2',
						fileName: 'file2.pdf',
						size: 67890,
						redactedItemId: 'redacted-file-2',
						redactedFileName: 'redacted-file2.pdf'
					}
				]
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference: 'app/ref',
				requiresReview: false,
				submittedByAddressId: 'abc-123',
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				submittedForId: 'myself',
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'yes',
				sharePointFolderCreated: 'yes',
				myselfFirstName: 'firstName',
				myselfLastName: 'lastName',
				myselfEmail: 'email@example.com',
				myselfComment: 'my comments',
				myselfContactPreference: 'post',
				myselfAddress: {
					id: 'abc-123',
					addressLine1: '221b Baker Street',
					addressLine2: 'apartment 2',
					townCity: 'London',
					county: 'Greater London',
					postcode: 'NW1 6XE'
				},
				myselfHearingPreference: 'yes',
				myselfContainsAttachments: 'yes',
				myselfAttachments: [
					{
						itemId: 'file-1',
						fileName: 'file1.pdf',
						size: 12345,
						redactedItemId: 'redacted-file-1',
						redactedFileName: 'redacted-file1.pdf'
					},
					{
						itemId: 'file-2',
						fileName: 'file2.pdf',
						size: 67890,
						redactedItemId: 'redacted-file-2',
						redactedFileName: 'redacted-file2.pdf'
					}
				],
				myselfRedactedAttachments: [{ fileName: 'redacted-file1.pdf' }, { fileName: 'redacted-file2.pdf' }],
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map the on behalf of common fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: undefined,
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
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
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: undefined,
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: 'r-id-1',
				submitterHearingPreference: 'yes',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: 'email',
				submitterAddress: undefined,
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				submitterContainsAttachments: 'yes',
				submitterAttachments: undefined,
				submitterRedactedAttachments: [],
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: undefined,
				submittedByAddressId: undefined,
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'yes',
				sharePointFolderCreated: 'no',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map the on behalf of person fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
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
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterHearingPreference: 'yes',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterAddress: undefined,
				submitterComment: 'my comments',
				submitterContainsAttachments: 'no',
				submitterAttachments: undefined,
				submitterRedactedAttachments: [],
				representedFirstName: 'represented firstName',
				representedLastName: 'represented lastName',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				submittedByAddressId: undefined,
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map the on behalf of person fields when contains attachments and redacted attachments', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
				containsAttachments: true,
				sharePointFolderCreated: true,
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
				submittedByAgentOrgName: 'agent org',
				Attachments: [
					{
						itemId: 'file-1',
						fileName: 'file1.pdf',
						size: 12345,
						redactedItemId: 'redacted-file-1',
						redactedFileName: 'redacted-file1.pdf'
					},
					{
						itemId: 'file-2',
						fileName: 'file2.pdf',
						size: 67890,
						redactedItemId: 'redacted-file-2',
						redactedFileName: 'redacted-file2.pdf'
					}
				]
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference: 'app/ref',
				requiresReview: false,
				submittedByAddressId: undefined,
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				submittedForId: 'on-behalf-of',
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'yes',
				sharePointFolderCreated: 'yes',
				representedTypeId: 'person',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				submitterContactPreference: undefined,
				submitterAddress: undefined,
				submitterHearingPreference: 'yes',
				submitterContainsAttachments: 'yes',
				submitterAttachments: [
					{
						itemId: 'file-1',
						fileName: 'file1.pdf',
						size: 12345,
						redactedItemId: 'redacted-file-1',
						redactedFileName: 'redacted-file1.pdf'
					},
					{
						itemId: 'file-2',
						fileName: 'file2.pdf',
						size: 67890,
						redactedItemId: 'redacted-file-2',
						redactedFileName: 'redacted-file2.pdf'
					}
				],
				submitterRedactedAttachments: [{ fileName: 'redacted-file1.pdf' }, { fileName: 'redacted-file2.pdf' }],
				representedFirstName: 'represented firstName',
				representedLastName: 'represented lastName',
				isAgent: 'yes',
				agentOrgName: 'agent org',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it('should map the on behalf of org fields', () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
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
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
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
				submitterRedactedAttachments: [],
				orgName: 'the orgs name',
				orgRoleName: 'my role',
				requiresReview: false,
				submitterAddress: undefined,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it(`should map the on behalf of org don't work for fields`, () => {
			const representation = {
				reference: 'ref',
				statusId: 'status-1',
				submittedDate: new Date('2025-01-01T00:00:00Z'),
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				wantsToBeHeard: true,
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				comment: 'my comments',
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
				submittedReceivedMethodId: 'phone',
				submissionMethodReason: 'This is a test',
				categoryId: 'c-id-1',
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				submittedByAddressId: undefined,
				submitterAddress: undefined,
				submitterHearingPreference: 'yes',
				submitterFirstName: 'firstName',
				submitterLastName: 'lastName',
				submitterContactPreference: undefined,
				submitterEmail: 'email@example.com',
				submitterComment: 'my comments',
				submitterContainsAttachments: 'no',
				submitterAttachments: undefined,
				submitterRedactedAttachments: [],
				isAgent: 'yes',
				agentOrgName: 'agent org',
				representedOrgName: 'Represented orgName',
				requiresReview: false,
				submittedByContactId: 'sub-id-1',
				representedContactId: 'rep-id-1',
				comment: 'my comments',
				commentRedacted: undefined,
				containsAttachments: 'no',
				sharePointFolderCreated: 'no',
				withdrawalRequestDate: undefined,
				withdrawalReasonId: undefined,
				withdrawalRequests: undefined,
				dateWithdrawn: undefined
			});
		});
		it(`should map withdraw reps fields`, () => {
			const representation = {
				withdrawalRequestDate: new Date('2025-01-01T00:00:00Z'),
				withdrawalReasonId: 'change-of-opinion',
				WithdrawalRequests: [
					{
						itemId: 'file-1',
						fileName: 'file1.pdf',
						size: 12345,
						redactedItemId: 'redacted-file-1',
						redactedFileName: 'redacted-file1.pdf'
					},
					{
						itemId: 'file-2',
						fileName: 'file2.pdf',
						size: 67890,
						redactedItemId: 'redacted-file-2',
						redactedFileName: 'redacted-file2.pdf'
					}
				],
				dateWithdrawn: new Date('2025-07-31T00:00:00Z')
			};
			const viewModel = representationToManageViewModel(representation, applicationReference);
			assert.deepStrictEqual(viewModel, {
				applicationReference: 'app/ref',
				requiresReview: false,
				submittedByAddressId: undefined,
				reference: undefined,
				statusId: undefined,
				submittedDate: undefined,
				submittedReceivedMethodId: 'online',
				submissionMethodReason: undefined,
				categoryId: undefined,
				submittedForId: undefined,
				submittedByContactId: undefined,
				representedContactId: undefined,
				comment: undefined,
				commentRedacted: undefined,
				containsAttachments: undefined,
				sharePointFolderCreated: undefined,
				withdrawalRequestDate: new Date('2025-01-01T00:00:00Z'),
				withdrawalReasonId: 'change-of-opinion',
				withdrawalRequests: [
					{
						itemId: 'file-1',
						fileName: 'file1.pdf',
						size: 12345,
						redactedItemId: 'redacted-file-1',
						redactedFileName: 'redacted-file1.pdf'
					},
					{
						itemId: 'file-2',
						fileName: 'file2.pdf',
						size: 67890,
						redactedItemId: 'redacted-file-2',
						redactedFileName: 'redacted-file2.pdf'
					}
				],
				dateWithdrawn: new Date('2025-07-31T00:00:00.000Z')
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
				myselfHearingPreference: 'yes',
				myselfContactPreference: 'email',
				myselfAddress: {
					addressLine1: 'line 1',
					addressLine2: 'line 2',
					townCity: 'town',
					county: 'county',
					postcode: 'AB12 3CD'
				}
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
				email: 'some@example.email',
				contactPreferenceId: 'email',
				Address: {
					create: {
						line1: 'line 1',
						line2: 'line 2',
						townCity: 'town',
						county: 'county',
						postcode: 'AB12 3CD'
					}
				}
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
				submitterHearingPreference: 'no',
				submitterContactPreference: 'post',
				submitterAddress: {
					addressLine1: 'line 1',
					addressLine2: 'line 2',
					townCity: 'town',
					county: 'county',
					postcode: 'AB12 3CD'
				}
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
				email: 'some@example.email',
				contactPreferenceId: 'post',
				Address: {
					create: {
						line1: 'line 1',
						line2: 'line 2',
						townCity: 'town',
						county: 'county',
						postcode: 'AB12 3CD'
					}
				}
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					containsAttachments: false
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
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
			it('should allow the user to override the submittedDate', (context) => {
				context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
				const id = 'id-1';
				const reference = 'ref';
				const mockAnswers = {
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					myselfFirstName: 'firstName',
					myselfLastName: 'lastName',
					myselfContactPreference: 'email',
					myselfEmail: 'myemail@email.com',
					myselfComment: 'my comments',
					myselfHearingPreference: 'yes',
					myselfContainsAttachments: 'no',
					submittedDate: new Date('2024-12-25T00:00:00Z')
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
					SubmittedReceivedMethod: {
						connect: {
							id: 'online'
						}
					},
					submittedDate: new Date('2024-12-25T00:00:00Z'),
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
					wantsToBeHeard: true
				});
			});
		});
		describe('submissionMethodReason', () => {
			it('should include submissionMethodReason when non-online and non-empty', () => {
				const mockAnswers = {
					submittedReceivedMethodId: 'email',
					submissionMethodReason: 'Valid reason'
				};

				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, 'Valid reason');
			});

			it('should not include submissionMethodReason when it is null for non-online received method', () => {
				const mockAnswers = {
					submittedReceivedMethodId: 'email',
					submissionMethodReason: null
				};

				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, undefined);
			});

			it('should not include submissionMethodReason when it is an empty string for non-online received method', () => {
				const mockAnswers = {
					submittedReceivedMethodId: 'email',
					submissionMethodReason: '   '
				};

				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, undefined);
			});

			it('should not include submissionMethodReason when received method is online and no reason provided', () => {
				const mockAnswers = {
					submittedReceivedMethodId: RECEIVED_METHOD_ID.ONLINE,
					submissionMethodReason: undefined
				};

				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, undefined);
			});

			it('should not include submissionMethodReason when submissionMethodReason answer object is undefined', () => {
				const mockAnswers = {
					submittedReceivedMethodId: 'email',
					submissionMethodReason: undefined
				};

				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, undefined);
			});
		});
		describe('SubmittedReceivedMethod and submissionMethodReason', () => {
			it('should default SubmittedReceivedMethod to ONLINE when submittedReceivedMethodId is not provided', () => {
				const RECEIVED_METHOD_ID = {
					ONLINE: 'online',
					EMAIL: 'email'
				};
				const mockAnswers = {};
				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.deepStrictEqual(createInput.SubmittedReceivedMethod, { connect: { id: RECEIVED_METHOD_ID.ONLINE } });
			});

			it('should use the provided submittedReceivedMethodId when given', () => {
				const RECEIVED_METHOD_ID = {
					ONLINE: 'online',
					EMAIL: 'email'
				};
				const mockAnswers = { submittedReceivedMethodId: RECEIVED_METHOD_ID.EMAIL };
				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.deepStrictEqual(createInput.SubmittedReceivedMethod, { connect: { id: RECEIVED_METHOD_ID.EMAIL } });
			});

			it('should include submissionMethodReason when provided', () => {
				const mockAnswers = {
					submittedReceivedMethodId: 'email',
					submissionMethodReason: 'User prefers email for communication'
				};
				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, 'User prefers email for communication');
			});

			it('should not include submissionMethodReason when not provided', () => {
				const mockAnswers = {};
				const createInput = viewModelToRepresentationCreateInput(mockAnswers, 'ref', 'id-1');
				assert.strictEqual(createInput.submissionMethodReason, undefined);
			});
		});
		describe('submittedReceivedMethodId behaviour', () => {
			it('should set submittedReceivedMethodId to ONLINE when it is null', () => {
				const representation = {
					submittedReceivedMethodId: null,
					statusId: 'status-1',
					SubmittedByContact: null
				};
				const applicationReference = 'app/ref';
				const viewModel = representationToManageViewModel(representation, applicationReference);
				assert.strictEqual(viewModel.submittedReceivedMethodId, RECEIVED_METHOD_ID.ONLINE);
			});

			it('should retain submittedReceivedMethodId when it is not null', () => {
				const representation = {
					submittedReceivedMethodId: RECEIVED_METHOD_ID.EMAIL,
					statusId: 'status-1',
					SubmittedByContact: null
				};
				const applicationReference = 'app/ref';
				const viewModel = representationToManageViewModel(representation, applicationReference);
				assert.strictEqual(viewModel.submittedReceivedMethodId, RECEIVED_METHOD_ID.EMAIL);
			});

			it('should handle undefined submittedReceivedMethodId and set it to ONLINE', () => {
				const representation = {
					submittedReceivedMethodId: undefined,
					statusId: 'status-1',
					SubmittedByContact: null
				};
				const applicationReference = 'app/ref';
				const viewModel = representationToManageViewModel(representation, applicationReference);
				assert.strictEqual(viewModel.submittedReceivedMethodId, RECEIVED_METHOD_ID.ONLINE);
			});
		});
	});
});

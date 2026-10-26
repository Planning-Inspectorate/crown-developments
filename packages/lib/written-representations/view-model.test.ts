import assert from 'assert';
import { describe, it } from 'node:test';
import { getRepresentationMessages } from './view-model.ts';
import {
	representationTitle,
	representationToViewModel
} from '@pins/crowndev-lib/written-representations/view-model.ts';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('getRepresentationMessages', () => {
	it('should return default message when no dates are set', () => {
		const result = getRepresentationMessages({});

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'You can submit a written representation (also known as ‘Have your say’) when the representation period is announced and open.'
		]);
	});

	it('should return message with formatted dates when representation period is in the future', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-01T10:00:00.000Z') });

		const startDate = new Date('2026-02-01T09:00:00.000Z');
		const endDate = new Date('2026-03-01T17:00:00.000Z');

		const result = getRepresentationMessages({
			representationsPeriodStartDate: startDate,
			representationsPeriodEndDate: endDate
		});

		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0], 'No written representations have been published yet.');
		assert.ok(result[1].includes('You can submit a written representation'));
	});

	it('should return message when period is open but no representations submitted', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = getRepresentationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z')
			},
			false,
			false
		);

		assert.deepStrictEqual(result, ['No written representations have been submitted yet.']);
	});

	it('should return under review message when period is open and submitted representations are not accepted', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = getRepresentationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z')
			},
			false,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
		]);
	});

	it('should inform date not set when period is open, representations accepted, but publish date missing', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = getRepresentationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
				representationsPublishDate: null
			},
			true,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'We’ll update this page once the date to publish representations has been set.'
		]);
	});

	it('should inform future publish date when period is open and publish date is in the future', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = getRepresentationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
				representationsPublishDate: new Date('2026-04-01T00:00:00.000Z')
			},
			true,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'You’ll be able to view the published representations from 01 April 2026'
		]);
	});

	it('should show review message when period is closed and no representations were accepted', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-01T10:00:00.000Z') });

		const result = getRepresentationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z')
			},
			false,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
		]);
	});

	it('should return empty list when period is closed, accepted reps exist, and publish date is in the past', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-01T10:00:00.000Z') });

		const result = getRepresentationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
				representationsPublishDate: new Date('2026-03-15T00:00:00.000Z')
			},
			true,
			true
		);

		assert.deepStrictEqual(result, []);
	});
});

describe('representationTitle', () => {
	it('should return the full name when submitted for MYSELF and user is an adult', () => {
		const representation = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe' }
		};

		assert.strictEqual(representationTitle(representation), 'John Doe');
	});

	it('should return agent name when ON_BEHALF_OF and agent is an adult', () => {
		const representation = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			SubmittedByContact: { firstName: 'Agent', lastName: 'Smith' },
			RepresentedContact: { firstName: 'John', lastName: 'Doe' },
			representedTypeId: REPRESENTED_TYPE_ID.PERSON,
			submittedByAgentOrgName: 'Agency Inc.'
		};

		assert.strictEqual(representationTitle(representation), 'Agent Smith (Agency Inc.) on behalf of John Doe');
	});

	it('should return "Agent Name on behalf of Represented Name" for ORGANISATION case', () => {
		const representation = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			SubmittedByContact: { firstName: 'Agent', lastName: 'Smith' },
			RepresentedContact: { firstName: 'John', lastName: 'Doe' },
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION
		};

		assert.strictEqual(representationTitle(representation), 'Agent Smith on behalf of John Doe');
	});

	it('should return "Agent Name (Org Name) on behalf of Represented Name" for ORG_NOT_WORK_FOR case', () => {
		const representation = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			SubmittedByContact: { firstName: 'Agent', lastName: 'Smith' },
			RepresentedContact: { firstName: 'John', lastName: 'Doe' },
			representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
			submittedByAgentOrgName: 'Agency Inc.'
		};

		assert.strictEqual(representationTitle(representation), 'Agent Smith (Agency Inc.) on behalf of John Doe');
	});
	it('should return undefined for invalid submittedForId', () => {
		const representation = {
			submittedForId: 'INVALID_ID'
		};

		assert.strictEqual(representationTitle(representation), undefined);
	});
});
describe('representationToViewModel', () => {
	it('should truncate long comments and add the read-more link when requested', () => {
		const representation = {
			reference: 'ABCDE-12345',
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe', orgName: null },
			comment: 'a'.repeat(501),
			commentRedacted: null,
			Category: { displayName: 'Category 1' },
			submittedDate: '2025-01-01T00:00:00.000Z',
			containsAttachments: false,
			Attachments: []
		};

		const result = representationToViewModel(representation, true);

		assert.strictEqual(result.representationComment, `${'a'.repeat(500)}... `);
		assert.strictEqual(
			result.truncatedReadMoreLink,
			'<a class="govuk-link govuk-link--no-visited-state" href="written-representations/ABCDE-12345">Read more</a>'
		);
	});

	it('should map representation to view model with attachments', () => {
		const representation = {
			reference: 'ref-123',
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe', orgName: null },
			comment: 'This is a comment',
			commentRedacted: null,
			Category: { displayName: 'Category 1' },
			submittedDate: '2025-01-01T00:00:00.000Z',
			containsAttachments: true,
			Attachments: [{ statusId: 'accepted' }, { statusId: 'rejected' }]
		};
		const result = representationToViewModel(representation);
		assert.deepStrictEqual(result, {
			representationReference: 'ref-123',
			representationTitle: 'John Doe',
			representationComment: 'This is a comment',
			representationCommentIsRedacted: false,
			representationCategory: 'Category 1',
			dateRepresentationSubmitted: '1 January 2025',
			hasAcceptedAttachments: true,
			distressingContent: false
		});
	});
	it('should map representation to view model without attachments', () => {
		const representation = {
			reference: 'ref-123',
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe', orgName: null },
			comment: 'This is a comment',
			commentRedacted: null,
			Category: { displayName: 'Category 1' },
			submittedDate: '2025-01-01T00:00:00.000Z',
			containsAttachments: true,
			Attachments: [{ statusId: 'rejected' }, { statusId: 'awaiting-review' }]
		};
		const result = representationToViewModel(representation);
		assert.deepStrictEqual(result, {
			representationReference: 'ref-123',
			representationTitle: 'John Doe',
			representationComment: 'This is a comment',
			representationCommentIsRedacted: false,
			representationCategory: 'Category 1',
			dateRepresentationSubmitted: '1 January 2025',
			hasAcceptedAttachments: false,
			distressingContent: false
		});
	});
	it('should map representation to view model if containsAttachments is updated', () => {
		const representation = {
			reference: 'ref-123',
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe', orgName: null },
			comment: 'This is a comment',
			commentRedacted: null,
			Category: { displayName: 'Category 1' },
			submittedDate: '2025-01-01T00:00:00.000Z',
			containsAttachments: false,
			Attachments: [{ statusId: 'accepted' }, { statusId: 'awaiting-review' }]
		};
		const result = representationToViewModel(representation);
		assert.deepStrictEqual(result, {
			representationReference: 'ref-123',
			representationTitle: 'John Doe',
			representationComment: 'This is a comment',
			representationCommentIsRedacted: false,
			representationCategory: 'Category 1',
			dateRepresentationSubmitted: '1 January 2025',
			hasAcceptedAttachments: false,
			distressingContent: false
		});
	});
	it('should map distressingContent to true when distressingContentInRepresentation is true', () => {
		const representation = {
			reference: 'ref-123',
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe', orgName: null },
			comment: 'This is a comment',
			commentRedacted: null,
			Category: { displayName: 'Category 1' },
			submittedDate: '2025-01-01T00:00:00.000Z',
			containsAttachments: false,
			Attachments: [],
			distressingContentInRepresentation: true
		};
		const result = representationToViewModel(representation);
		assert.deepStrictEqual(result, {
			representationReference: 'ref-123',
			representationTitle: 'John Doe',
			representationComment: 'This is a comment',
			representationCommentIsRedacted: false,
			representationCategory: 'Category 1',
			dateRepresentationSubmitted: '1 January 2025',
			hasAcceptedAttachments: false,
			distressingContent: true
		});
	});
	it('should map distressingContent to false when distressingContentInRepresentation is null', () => {
		const representation = {
			reference: 'ref-123',
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			SubmittedByContact: { firstName: 'John', lastName: 'Doe', orgName: null },
			comment: 'This is a comment',
			commentRedacted: null,
			Category: { displayName: 'Category 1' },
			submittedDate: '2025-01-01T00:00:00.000Z',
			containsAttachments: false,
			Attachments: [],
			distressingContentInRepresentation: null
		};
		const result = representationToViewModel(representation);
		assert.deepStrictEqual(result, {
			representationReference: 'ref-123',
			representationTitle: 'John Doe',
			representationComment: 'This is a comment',
			representationCommentIsRedacted: false,
			representationCategory: 'Category 1',
			dateRepresentationSubmitted: '1 January 2025',
			hasAcceptedAttachments: false,
			distressingContent: false
		});
	});
});

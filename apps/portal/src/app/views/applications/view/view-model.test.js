import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	applicationLinks,
	applicationUpdateToTimelineItem,
	crownDevelopmentToViewModel,
	representationTitle,
	representationToViewModel
} from './view-model.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('view-model', () => {
	describe('crownDevelopmentToViewModel', () => {
		it(`should map crown development view model`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				Type: {
					displayName: 'Planning permission'
				},
				ApplicantContact: {
					orgName: 'Applicant Name'
				},
				Lpa: {
					name: 'Test LPA'
				},
				SecondaryLpa: {
					name: 'Test SecondaryLPA'
				},
				Stage: {
					displayName: 'Inquiry'
				},
				Procedure: {
					displayName: 'Inquiry'
				},
				Event: {
					date: '2025-04-01T23:00:00.000Z',
					venue: 'City hall',
					statementsDate: '2025-04-30T23:00:00.000Z',
					proofsOfEvidenceDate: '2025-10-09T23:00:00.000Z'
				},
				applicationAcceptedDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodStartDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodEndDate: '2025-10-09T23:00:00.000Z',
				representationsPublishDate: '2025-10-09T09:00:00.000Z',
				decisionDate: '2025-10-09T23:00:00.000Z',
				DecisionOutcome: {
					displayName: 'Approved'
				},
				description: 'A significant project',
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				},
				containsDistressingContent: true
			};
			const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'reference-id-1',
				applicantName: 'Applicant Name',
				applicationType: 'Planning permission',
				crownDevelopmentContactEmail: 'crown.dev@planninginspectorate.gov.uk',
				description: 'A significant project',
				stage: 'Inquiry',
				lpaName: 'Test LPA',
				SecondaryLpa: { name: 'Test SecondaryLPA' },
				siteAddress: 'Site Street, Site Town, Site ONE',
				applicationAcceptedDate: '10 October 2025',
				decisionDate: '10 October 2025',
				decisionOutcome: 'Approved',
				procedure: 'Inquiry',
				representationsPeriodEndDate: '10 October 2025',
				representationsPeriodEndDateTime: '10 October 2025 at 12:00am',
				representationsPeriodStartDate: '10 October 2025',
				representationsPeriodStartDateTime: '10 October 2025 at 12:00am',
				representationsPublishDate: '9 October 2025',
				containsDistressingContent: true
			});
		});
		it(`should map site address if present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project',
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				}
			};
			const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			assert.equal(result.siteAddress, 'Site Street, Site Town, Site ONE');
		});
		it(`should not map site address if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			assert.strictEqual(result.siteAddress, undefined);
		});
		it(`should not map nested fields if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = crownDevelopmentToViewModel(input, 'crown.dev@planninginspectorate.gov.uk');
			assert.strictEqual(result.applicationType, undefined);
			assert.strictEqual(result.lpaName, undefined);
			assert.strictEqual(result.applicantName, undefined);
		});
		it(`should not map crownDevelopmentContactEmail field if config not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const result = crownDevelopmentToViewModel(input, undefined);
			assert.strictEqual(result.crownDevelopmentContactEmail, undefined);
		});
		it(`should map inquiry fields if procedure id is inquiry`, () => {
			const input = {
				procedureId: 'inquiry',
				Event: {
					date: '2025-04-01T23:00:00.000Z',
					venue: 'City hall',
					statementsDate: '2025-04-30T23:00:00.000Z',
					proofsOfEvidenceDate: '2025-10-09T23:00:00.000Z'
				}
			};
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.isInquiry, true);
			assert.strictEqual(result.inquiryDate, '2 April 2025');
			assert.strictEqual(result.inquiryVenue, 'City hall');
			assert.strictEqual(result.inquiryStatementsDate, '1 May 2025');
			assert.strictEqual(result.inquiryProofsOfEvidenceDate, '10 October 2025');
		});
		it(`should map hearing fields if procedure id is hearing`, () => {
			const input = {
				procedureId: 'hearing',
				Event: {
					date: '2025-04-01T23:00:00.000Z',
					venue: 'City hall'
				}
			};
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.isHearing, true);
			assert.strictEqual(result.hearingDate, '2 April 2025');
			assert.strictEqual(result.hearingVenue, 'City hall');
		});
		it('should map subType field if a subType is present', () => {
			const input = {
				SubType: {
					displayName: 'Sub Type'
				}
			};
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.applicationSubType, 'Sub Type');
		});
		it('should include all links when restrictLinks is true', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined, true);
			assert.deepStrictEqual(result, [
				{ href: `/applications/${id}/application-information`, text: 'Application information' },
				{ href: `/applications/${id}/documents`, text: 'Documents' },
				{ href: `/applications/${id}/have-your-say`, text: 'Have your say' },
				{ href: `/applications/${id}/application-updates`, text: 'Application updates' },
				{ href: `/applications/${id}/written-representations`, text: 'Written representations' }
			]);
		});
		it('should exclude all links except application information when restrictLinks is false and isWithdrawn and isExpired is true', () => {
			const id = 'id-1';
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined, false);
			assert.deepStrictEqual(result, [
				{ href: `/applications/${id}/application-information`, text: 'Application information' }
			]);
		});
	});
	describe('applicationLinks', () => {
		it('should include Have your say when within the representation submission period', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

			/** @type {{start: Date, end: Date}} */
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, false);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				},
				{
					href: `/applications/${id}/have-your-say`,
					text: 'Have your say'
				},
				{
					href: `/applications/${id}/written-representations`,
					text: 'Written representations'
				}
			]);
		});
		it('should include application updates when present on crown dev application', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

			/** @type {{start: Date, end: Date}} */
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined, true);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				},
				{
					href: `/applications/${id}/have-your-say`,
					text: 'Have your say'
				},
				{
					href: `/applications/${id}/application-updates`,
					text: 'Application updates'
				},
				{
					href: `/applications/${id}/written-representations`,
					text: 'Written representations'
				}
			]);
		});
		it('should not include Have your say when outside the representation submission period or Written Representations when now before representations publish date', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-31T00:00:00.000Z') });
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-02-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, false);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				}
			]);
		});
		it('should show all links if applicationStatus is active', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined, undefined);
			assert(result.some((link) => link.text === 'Documents'));
			assert(result.some((link) => link.text === 'Have your say'));
			assert(result.some((link) => link.text === 'Application updates'));
			assert(result.some((link) => link.text === 'Written representations'));
		});

		it('should not include have your say link when applicationStatus is withdrawn', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(
				id,
				haveYourSayPeriod,
				representationsPublishDate,
				true,
				'withdrawn',
				'withdrawn'
			);
			assert.deepStrictEqual(result, [
				{ href: `/applications/${id}/application-information`, text: 'Application information' },
				{ href: `/applications/${id}/documents`, text: 'Documents' },
				{ href: `/applications/${id}/application-updates`, text: 'Application updates' },
				{ href: `/applications/${id}/written-representations`, text: 'Written representations' }
			]);
		});
		it('should only show Application information link when applicationStatus is expired', () => {
			const id = 'id-1';
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, 'expired');
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				}
			]);
		});
		it('should default to showing all links when applicationStatus is undefined', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined, 'withdrawn');
			assert.deepStrictEqual(result, [
				{ href: `/applications/${id}/application-information`, text: 'Application information' },
				{ href: `/applications/${id}/documents`, text: 'Documents' },
				{ href: `/applications/${id}/have-your-say`, text: 'Have your say' },
				{ href: `/applications/${id}/application-updates`, text: 'Application updates' },
				{ href: `/applications/${id}/written-representations`, text: 'Written representations' }
			]);
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
				dateRepresentationSubmitted: '1 Jan 2025',
				representationContainsAttachments: true,
				hasAttachments: true
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
				dateRepresentationSubmitted: '1 Jan 2025',
				representationContainsAttachments: true,
				hasAttachments: false
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
				dateRepresentationSubmitted: '1 Jan 2025',
				representationContainsAttachments: false,
				hasAttachments: false
			});
		});
	});
	describe('applicationUpdateToTimelineItem', () => {
		it('should return when application update is falsy value', () => {
			assert.strictEqual(applicationUpdateToTimelineItem(null), undefined);
		});
		it('should map application update to timeline item if application update value is present', () => {
			const response = applicationUpdateToTimelineItem({
				details: 'an update',
				firstPublished: new Date('2025-01-01T00:00:00.000Z')
			});
			assert.deepStrictEqual(response, {
				details: 'an update',
				firstPublished: '1 January 2025'
			});
		});
	});
});

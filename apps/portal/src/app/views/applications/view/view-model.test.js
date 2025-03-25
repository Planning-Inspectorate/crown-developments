import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applicationLinks, crownDevelopmentToViewModel, representationTitle } from './view-model.js';
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
					fullName: 'Applicant Name'
				},
				Lpa: {
					name: 'Test LPA'
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
				applicationCompleteDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodStartDate: '2025-10-09T23:00:00.000Z',
				representationsPeriodEndDate: '2025-10-09T23:00:00.000Z',
				decisionDate: '2025-10-09T23:00:00.000Z',
				description: 'A significant project',
				SiteAddress: {
					line1: 'Site Street',
					townCity: 'Site Town',
					postcode: 'Site ONE'
				}
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.deepStrictEqual(result, {
				id: 'id-1',
				reference: 'reference-id-1',
				applicantName: 'Applicant Name',
				applicationType: 'Planning permission',
				crownDevelopmentContactEmail: 'crown.dev@planninginspectorate.gov.uk',
				description: 'A significant project',
				stage: 'Inquiry',
				lpaName: 'Test LPA',
				siteAddress: 'Site Street, Site Town, Site ONE',
				applicationCompleteDate: '10 Oct 2025',
				decisionDate: '10 Oct 2025',
				procedure: 'Inquiry',
				representationsPeriodEndDate: '10 Oct 2025',
				representationsPeriodEndDateTime: '10 Oct 2025 00:00',
				representationsPeriodStartDate: '10 Oct 2025',
				representationsPeriodStartDateTime: '10 Oct 2025 00:00'
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
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.equal(result.siteAddress, 'Site Street, Site Town, Site ONE');
		});
		it(`should not map site address if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
			assert.strictEqual(result.siteAddress, undefined);
		});
		it(`should not map nested fields if not present`, () => {
			const input = {
				id: 'id-1',
				reference: 'reference-id-1',
				description: 'A significant project'
			};
			const config = {
				crownDevContactInfo: {
					email: 'crown.dev@planninginspectorate.gov.uk'
				}
			};
			const result = crownDevelopmentToViewModel(input, config);
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
			const config = {};
			const result = crownDevelopmentToViewModel(input, config);
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
			assert.strictEqual(result.inquiryDate, '2 Apr 2025');
			assert.strictEqual(result.inquiryVenue, 'City hall');
			assert.strictEqual(result.inquiryStatementsDate, '1 May 2025');
			assert.strictEqual(result.inquiryProofsOfEvidenceDate, '10 Oct 2025');
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
			assert.strictEqual(result.hearingDate, '2 Apr 2025');
			assert.strictEqual(result.hearingVenue, 'City hall');
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
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application Information'
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
		it('should not include Have your say when outside the representation submission period or Written Representations when now before representations publish date', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-31T00:00:00.000Z') });
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-02-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application Information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				}
			]);
		});
	});
	describe('representationTitle', () => {
		it('should return the full name when submitted for MYSELF and user is an adult', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				SubmittedByContact: { isAdult: true, fullName: 'John Doe' }
			};

			assert.strictEqual(representationTitle(representation), 'John Doe');
		});

		it('should return "A member of the public" when submitted for MYSELF and user is not an adult', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				SubmittedByContact: { isAdult: false, fullName: 'John Doe' }
			};

			assert.strictEqual(representationTitle(representation), 'A member of the public');
		});

		it('should return agent name when ON_BEHALF_OF and agent is an adult', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				SubmittedByContact: { isAdult: true, fullName: 'Agent Smith' },
				RepresentedContact: { isAdult: true, fullName: 'John Doe' },
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submittedByAgentOrgName: 'Agency Inc.'
			};

			assert.strictEqual(representationTitle(representation), 'Agent Smith (Agency Inc.) on behalf of John Doe');
		});

		it('should return "A representative" when ON_BEHALF_OF and agent is not an adult', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				SubmittedByContact: { isAdult: false, fullName: 'Agent Smith' },
				RepresentedContact: { isAdult: true, fullName: 'John Doe' },
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submittedByAgentOrgName: 'Agency Inc.'
			};

			assert.strictEqual(representationTitle(representation), 'A representative (Agency Inc.) on behalf of John Doe');
		});

		it('should return "A member of the public" for represented person if they are not an adult', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				SubmittedByContact: { isAdult: true, fullName: 'Agent Smith' },
				RepresentedContact: { isAdult: false, fullName: 'John Doe' },
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submittedByAgentOrgName: 'Agency Inc.'
			};

			assert.strictEqual(
				representationTitle(representation),
				'Agent Smith (Agency Inc.) on behalf of A member of the public'
			);
		});

		it('should return "Agent Name on behalf of Represented Name" for ORGANISATION case', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				SubmittedByContact: { isAdult: true, fullName: 'Agent Smith' },
				RepresentedContact: { isAdult: true, fullName: 'John Doe' },
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION
			};

			assert.strictEqual(representationTitle(representation), 'Agent Smith on behalf of John Doe');
		});

		it('should return "Agent Name (Org Name) on behalf of Represented Name" for ORG_NOT_WORK_FOR case', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				SubmittedByContact: { isAdult: true, fullName: 'Agent Smith' },
				RepresentedContact: { isAdult: true, fullName: 'John Doe' },
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
		it('should handle missing SubmittedByContact gracefully', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
			};

			assert.strictEqual(representationTitle(representation), 'A member of the public');
		});
		it('should handle missing RepresentedContact gracefully', () => {
			const representation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				SubmittedByContact: { isAdult: true, fullName: 'Agent Smith' },
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submittedByAgentOrgName: 'Agency Inc.'
			};

			assert.strictEqual(
				representationTitle(representation),
				'Agent Smith (Agency Inc.) on behalf of A member of the public'
			);
		});
	});
});

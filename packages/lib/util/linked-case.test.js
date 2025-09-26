import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import {
	getLinkedCaseId,
	getLinkedCaseLinkText,
	getSummaryWarningMessage,
	hasLinkedCase,
	linkedCaseIsPublished
} from './linked-case.js';

describe('linked case util', () => {
	describe('getLinkedCaseId', () => {
		it('should return linked case id if linkedParentId exists on crown development', () => {
			assert.strictEqual(getLinkedCaseId({ linkedParentId: 'case-id' }), 'case-id');
		});
		it('should return linked case id if ChildrenCrownDevelopment list contains a valid case', () => {
			const crownDevelopment = {
				ChildrenCrownDevelopment: [{ id: 'case-id' }]
			};
			assert.strictEqual(getLinkedCaseId(crownDevelopment), 'case-id');
		});
		it('should return undefined if neither fields exist on case', () => {
			assert.strictEqual(getLinkedCaseId({}), undefined);
		});
	});
	describe('hasLinkedCase', () => {
		it('should return true if linked case id is non empty string', () => {
			assert.strictEqual(hasLinkedCase({ linkedParentId: 'case-id' }), true);
		});
		it('should return false if linked case id is empty string', () => {
			assert.strictEqual(hasLinkedCase({ linkedParentId: '' }), false);
		});
		it('should return false if linked case id is undefined', () => {
			assert.strictEqual(hasLinkedCase({}), false);
		});
		it('should return false if linked case id is not a string', () => {
			const crownDevelopment = {
				linkedParentId: () => true
			};
			assert.strictEqual(hasLinkedCase(crownDevelopment), false);
		});
	});
	describe('linkedCaseIsPublished', () => {
		it('should return true if published date in the past', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'linked-case-reference',
						publishDate: new Date('2025-06-01T00:00:00.000Z')
					}))
				}
			};
			const crownDevelopment = {
				linkedParentId: 'case-id'
			};

			assert.strictEqual(await linkedCaseIsPublished(mockDb, crownDevelopment), true);
		});
		it('should return false if published date in the future', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'linked-case-reference',
						publishDate: tomorrow
					}))
				}
			};
			const crownDevelopment = {
				linkedParentId: 'case-id'
			};

			assert.strictEqual(await linkedCaseIsPublished(mockDb, crownDevelopment), false);
		});
		it('should return false if no published date not set on case', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'linked-case-reference'
					}))
				}
			};
			const crownDevelopment = {
				linkedParentId: 'case-id'
			};

			assert.strictEqual(await linkedCaseIsPublished(mockDb, crownDevelopment), false);
		});
		it('should return undefined if no case returned from db', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const crownDevelopment = {
				linkedParentId: 'case-id'
			};

			assert.strictEqual(await linkedCaseIsPublished(mockDb, crownDevelopment), false);
		});
	});
	describe('getLinkedCaseLinkText', () => {
		it('should return planning permission link if linked case has subtype planning permission', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						subTypeId: APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION
					}))
				}
			};
			const crownDevelopment = {
				linkedParentId: 'linked-case-id'
			};
			assert.strictEqual(await getLinkedCaseLinkText(mockDb, crownDevelopment), 'planning permission');
		});
		it('should return lbc link if linked case has subtype lbc', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						subTypeId: APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT
					}))
				}
			};
			const crownDevelopment = {
				linkedParentId: 'linked-case-id'
			};
			assert.strictEqual(await getLinkedCaseLinkText(mockDb, crownDevelopment), 'Listed Building Consent (LBC)');
		});
	});
	describe('getSummaryWarningMessage', () => {
		it('should return second case warning text if type of application is planning and lbc', () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							typeOfApplication: APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
						}
					}
				}
			};

			assert.strictEqual(
				getSummaryWarningMessage(mockRes),
				'Clicking accept & submit will create a second case as part of the connected application'
			);
		});
		it('should return notification warning text if type of application is not planning and lbc', () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							typeOfApplication: APPLICATION_TYPE_ID.OUTLINE_PLANNING_SOME_RESERVED
						}
					}
				}
			};

			assert.strictEqual(
				getSummaryWarningMessage(mockRes),
				'Clicking Accept & Submit will send a notification to the applicant / agent'
			);
		});
		it('should throw error if answers object is not present', () => {
			assert.throws(() => getSummaryWarningMessage({}));
		});
	});
});

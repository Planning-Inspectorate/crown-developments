import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { getBannerMessages } from './banner-utils.ts';

describe('getBannerMessages', () => {
	const mockReq = (baseUrl = '/cases/123/manage-representations'): Request =>
		({
			baseUrl
		}) as unknown as Request;

	const mockRes = (answers: Record<string, unknown> = {}): Response =>
		({
			locals: {
				journey: {
					response: {
						answers
					}
				}
			}
		}) as unknown as Response;

	it('should add a success banner when representationUpdated option is true', () => {
		const req = mockReq();
		const res = mockRes();

		const banner = getBannerMessages(res, req, { representationUpdated: true }) as unknown as Record<string, any>;

		assert.ok(banner);
		assert.ok(JSON.stringify(banner).includes('Representation has been updated'));
	});

	it('should generate noAttachmentsAdded banner for MYSELF submitter', () => {
		const req = mockReq('/cases/123/manage-representations');
		const res = mockRes({
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfContainsAttachments: BOOLEAN_OPTIONS.YES,
			myselfAttachments: []
		});

		const banner = getBannerMessages(res, req, { representationUpdated: false }) as unknown as Record<string, any>;

		const bannerString = JSON.stringify(banner);
		assert.ok(bannerString.includes('There are no attachments added.'));
		assert.ok(bannerString.includes('/cases/123/manage-representations/edit/myself/attachments'));
	});

	it('should generate noAttachmentsAdded banner for AGENT/submitter', () => {
		const req = mockReq('/cases/123/manage-representations');
		const res = mockRes({
			submittedForId: 'ANOTHER_TYPE',
			submitterContainsAttachments: BOOLEAN_OPTIONS.YES,
			submitterAttachments: []
		});

		const banner = getBannerMessages(res, req, { representationUpdated: false }) as unknown as Record<string, any>;

		const bannerString = JSON.stringify(banner);
		assert.ok(bannerString.includes('There are no attachments added.'));
		assert.ok(bannerString.includes('/cases/123/manage-representations/edit/agent/attachments'));
	});

	it('should generate awaitingReview banner when attachments require review and status is not awaiting review', () => {
		const req = mockReq('/cases/123/manage-representations');
		const res = mockRes({
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
			myselfContainsAttachments: BOOLEAN_OPTIONS.YES,
			myselfBlobAttachments: [{ statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW }]
		});

		const banner = getBannerMessages(res, req, { representationUpdated: false }) as unknown as Record<string, any>;

		const bannerString = JSON.stringify(banner);
		assert.ok(bannerString.includes('There are attachments awaiting review.'));
		assert.ok(bannerString.includes('/cases/123/manage-representations/manage/task-list'));
	});

	it('should trim /review from currentUrl when building banner hrefs', () => {
		const req = mockReq('/cases/123/manage-representations/review');
		const res = mockRes({
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
			myselfContainsAttachments: BOOLEAN_OPTIONS.YES,
			myselfAttachments: [{ statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW }]
		});

		const banner = getBannerMessages(res, req, { representationUpdated: false }) as unknown as Record<string, any>;

		const bannerString = JSON.stringify(banner);
		assert.ok(bannerString.includes('/cases/123/manage-representations/manage/task-list'));
		assert.strictEqual(bannerString.includes('/review/manage/task-list'), false);
	});

	it('should not show awaitingReview banner if main representation status is already AWAITING_REVIEW', () => {
		const req = mockReq();
		const res = mockRes({
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
			myselfContainsAttachments: BOOLEAN_OPTIONS.YES,
			myselfAttachments: [{ statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW }]
		});

		const banner = getBannerMessages(res, req, { representationUpdated: false }) as unknown as Record<string, any>;

		const bannerString = JSON.stringify(banner);
		assert.strictEqual(bannerString.includes('There are attachments awaiting review.'), false);
	});
});

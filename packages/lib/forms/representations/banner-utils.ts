import type { Request, Response } from 'express';

import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { getSubmittedForId } from '@pins/crowndev-lib/util/questions.ts';
import { escapeHtml, isSafeRelativeUrl } from '@pins/crowndev-lib/util/string.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';

interface BannerOptions {
	representationUpdated: boolean;
}

/**
 * Constructs the notification banners (success or info) to display at the top of the view.
 */
export function getBannerMessages(res: Response, req: Request, options: BannerOptions) {
	const bannerBuilder = new BannerBuilder();

	if (options.representationUpdated) {
		bannerBuilder.addSuccessText('Representation has been updated');
	}

	const documentInfoBanner = getDocumentInfoBanner(res, req.baseUrl);

	if (!documentInfoBanner) {
		return bannerBuilder.build();
	}

	const safeHref = escapeHtml(isSafeRelativeUrl(documentInfoBanner.href) ? documentInfoBanner.href : '#');

	if (documentInfoBanner.name === 'awaitingReview') {
		return bannerBuilder
			.addInfoTrustedSingleLineHtml(
				`There are attachments awaiting review.
                <a class="govuk-notification-banner__link" href="${safeHref}">Manage attachments</a>.`
			)
			.build();
	}

	if (documentInfoBanner.name === 'noAttachmentsAdded') {
		return bannerBuilder
			.addInfoTrustedSingleLineHtml(
				`There are no attachments added.
                <a class="govuk-notification-banner__link" href="${safeHref}">Add attachments</a>.`
			)
			.build();
	}

	return bannerBuilder.build();
}

/**
 * Evaluates the current representation state to determine if an attachment-related
 * warning banner (e.g., 'noAttachmentsAdded' or 'awaitingReview') should be displayed.
 */
function getDocumentInfoBanner(res: Response, currentUrl: string) {
	const journey = res.locals.journey;
	const answers = journey?.response?.answers || {};

	const submittedForId = getSubmittedForId(answers);
	const prefix = submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'submitter';

	const status = answers['statusId'];
	const containsAttachments = answers[`${prefix}ContainsAttachments`];
	const attachments = (answers[`${prefix}Attachments`] || answers[`${prefix}BlobAttachments`] || []) as {
		statusId: string;
	}[];

	const someAttachmentsAwaitingReview = attachments?.some(
		(attachment) => attachment.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	);

	const trimmedUrl = currentUrl?.replace(/\/review$/, '');

	if (containsAttachments === BOOLEAN_OPTIONS.YES && attachments.length === 0) {
		const urlSection = submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'agent';
		return {
			name: 'noAttachmentsAdded',
			href: `${trimmedUrl}/edit/${urlSection}/attachments`
		};
	}

	const shouldShowAwaitingReviewBanner =
		status !== REPRESENTATION_STATUS_ID.AWAITING_REVIEW &&
		containsAttachments === BOOLEAN_OPTIONS.YES &&
		someAttachmentsAwaitingReview;

	if (shouldShowAwaitingReviewBanner) {
		return {
			name: 'awaitingReview',
			href: `${trimmedUrl}/manage/task-list`
		};
	}

	return null;
}

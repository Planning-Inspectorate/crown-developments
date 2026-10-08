import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AsyncRequestHandlerWithLocals } from '@planning-inspectorate/core/util';

import { s62aRepresentationToManageViewModel } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import { JourneyResponse, list } from '@planning-inspectorate/dynamic-forms';
import type { JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import { getBannerMessages } from '@pins/crowndev-lib/forms/representations/banner-utils.ts';
import { buildRepresentationQuestions } from '@pins/crowndev-lib/forms/representations/form-utils.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { combineSessionAndDbData } from '@pins/crowndev-lib/util/merge-data.ts';
import { getOptionalAnswers } from '@pins/crowndev-lib/util/answers.ts';
import type { HaveYourSayManageModel } from '@pins/crowndev-lib/forms/representations/types.d.ts';
import type { BaseLocals } from '../../../../../../../types/express-locals.ts';

/**
 * Locals set by `buildGetJourneyMiddleware` for the representation view/manage journey.
 */
export interface RepresentationViewLocals extends BaseLocals {
	journeyResponse: JourneyResponseLike<HaveYourSayManageModel>;
	originalAnswers: HaveYourSayManageModel;
	fieldDisplayNames: Record<string, string>;
}

/**
 * Builds middleware to fetch case and representation data, and initializes the dynamic forms Journey.
 */
export function buildGetJourneyMiddleware(
	service: ManageService
): AsyncRequestHandlerWithLocals<RepresentationViewLocals> {
	const { db, logger } = service;

	return async (req, res, next) => {
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);
		logger.info({ id, representationRef }, 'Fetching representation for view/manage journey');

		const s62aCase = await db.s62aCase.findUnique({
			where: { id },
			select: { reference: true }
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			include: {
				SubmittedFor: true,
				SubmittedByContact: { include: { Address: true } },
				RepresentedContacts: true,
				Attachments: true,
				BlobWithdrawalRequestDocuments: true
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const answers = s62aRepresentationToManageViewModel(representation, s62aCase.reference);
		const sessionAnswers = getOptionalAnswers<HaveYourSayManageModel>(res);

		const finalAnswers = combineSessionAndDbData(answers, sessionAnswers);

		const taskListUrl = req.baseUrl + '/manage/task-list';

		const questions = buildRepresentationQuestions(answers, taskListUrl, true);

		// Question titles by field name, used as labels in the case history
		type QuestionBase = { fieldName?: string; title?: string };
		res.locals.fieldDisplayNames = Object.fromEntries(
			(Object.values(questions) as QuestionBase[])
				.filter((q): q is QuestionBase & { fieldName: string; title: string } => Boolean(q?.fieldName && q?.title))
				.map((q) => [q.fieldName, q.title])
		);

		res.locals.originalAnswers = { ...answers };
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', finalAnswers);
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req);

		if (req.originalUrl !== req.baseUrl) {
			// Set back link to details page, provided we are not currently on the details page
			res.locals.backLinkUrl = req.baseUrl + '/view';
		}

		if (next) next();
	};
}

/**
 * Main render controller for the representation view.
 * Consumes one-time flash messages (errors, success states) from the session.
 */
export async function renderRepresentation(req: Request, res: Response, viewData = {}) {
	const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

	const errors = popSessionData(req, representationRef, 'errors', [], 'representations');
	if (errors && errors.length > 0) {
		res.locals.errorSummary = errors;
	}

	const representationUpdated = popSessionData(
		req,
		representationRef,
		'representationUpdated',
		false,
		'representations'
	);
	const banner = getBannerMessages(res, req, { representationUpdated });
	const answers = getOptionalAnswers<HaveYourSayManageModel>(res);

	await list(req, res, '', {
		representationRef,
		requiresReview: answers?.requiresReview,
		backLinkUrl: `/s62a/cases/${id}/manage-representations`,
		currentUrl: req.originalUrl,
		representationStatus: answers?.statusId,
		banner,
		...viewData
	});
}

import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';

import { s62aRepresentationToManageViewModel } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import { JourneyResponse, list } from '@planning-inspectorate/dynamic-forms';
import { getBannerMessages } from '@pins/crowndev-lib/forms/representations/banner-utils.ts';
import { buildRepresentationQuestions } from '@pins/crowndev-lib/forms/representations/form-utils.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { combineSessionAndDbData } from '@pins/crowndev-lib/util/merge-data.ts';

/**
 * Builds middleware to fetch case and representation data, and initializes the dynamic forms Journey.
 */
export function buildGetJourneyMiddleware(service: ManageService): AsyncRequestHandler {
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
				Attachments: true
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const answers = s62aRepresentationToManageViewModel(representation, s62aCase.reference);
		const sessionAnswers = res.locals.journeyResponse?.answers;

		const finalAnswers = combineSessionAndDbData(answers, sessionAnswers);

		const taskListUrl = req.baseUrl + '/manage/task-list';

		const questions = buildRepresentationQuestions(answers, taskListUrl, true);

		// @ts-expect-error - mismatch in dynamic-forms journey typing vs strict local types
		res.locals.originalAnswers = { ...answers };
		// @ts-expect-error - mismatch in dynamic-forms journey typing
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

	const representationUpdated = popSessionData(req, id, 'representationUpdated', false, 'representations');
	const banner = getBannerMessages(res, req, { representationUpdated });
	const answers: Record<string, unknown> | undefined = res.locals?.journeyResponse?.answers;

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

import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { JourneyResponse, list } from '@planning-inspectorate/dynamic-forms';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getQuestions } from './questions.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { VIEW_TAB_ID, VIEW_TABS } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { s62aCaseToViewModel } from './view-model.ts';
import { isUnsafeObjectKey } from '@pins/crowndev-lib/util/session.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import type { Request, Response } from 'express';

export function buildViewCaseDetails(): AsyncRequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		const reference = getStringParam(res?.locals?.journeyResponse?.answers, 'reference');
		const banner = getBannerMessages(id, res, req);
		const baseUrl = req.baseUrl;

		await list(req, res, '', {
			caseId: id,
			reference,
			baseUrl,
			backLinkUrl: res.locals.backLinkUrl || '/s62a/cases',
			backLinkText: 'Back to all applications',
			currentUrl: req.originalUrl,
			currentTab: req.params.tab || VIEW_TAB_ID.OVERVIEW,
			viewTabs: VIEW_TABS,
			// URL without the /:tab slug, needed for routing uses in FE.
			cleanUrl: `/s62a/cases/${id}`,
			banner
		});
	};
}

export function buildGetJourneyMiddleware(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res, next) => {
		const id = getStringParam(req.params, 'id');

		logger.info({ id }, 'view S62A case');

		const s62aCase = await db.s62aCase.findUnique({
			include: {
				S62aStatus: true,
				SiteAddress: true,
				S62aDates: true,
				S62aFees: true
			},
			where: { id }
		});

		if (s62aCase === null) {
			return notFoundHandler(req, res);
		}

		const answers = s62aCaseToViewModel(s62aCase);

		const questions = getQuestions(answers);

		// @ts-expect-error - we haven't defined the view model on the locals object
		res.locals.originalAnswers = { ...answers };
		// @ts-expect-error - we haven't defined the view model on the locals object
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', answers);
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req);

		res.locals.backLinkUrl = req.baseUrl;

		if (next) next();
	};
}

/**
 * Builds out the various banners we will need on the case details page
 */
function getBannerMessages(id: string, res: Response, req: Request) {
	if (res.locals.errorSummary) {
		return null;
	}

	const bannerBuilder = new BannerBuilder();
	const caseUpdated = readCaseUpdatedSession(req, id);

	clearCaseUpdatedSession(req, id);

	if (caseUpdated) {
		bannerBuilder.addSuccessText('Case has been updated.');
		return bannerBuilder.build();
	}

	return bannerBuilder.build();
}

/**
 * Read a case updated flag from the session
 */
export function readCaseUpdatedSession(req: Request, id: string): boolean {
	if (!req.session || isUnsafeObjectKey(id)) {
		return false;
	}

	const caseProps = (req.session?.cases && req.session.cases[id]) || {};
	return Boolean(caseProps.updated);
}

/**
 * Clear a case updated flag from the session
 */
export function clearCaseUpdatedSession(req: Request, id: string): void {
	if (!req.session) {
		return;
	}

	if (isUnsafeObjectKey(id)) {
		throw new Error('Unsafe object key detected');
	}

	const caseProps = (req.session?.cases && req.session.cases[id]) || {};
	delete caseProps.updated;
}

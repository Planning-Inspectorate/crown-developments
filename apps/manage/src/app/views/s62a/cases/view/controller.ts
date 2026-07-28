import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { clearDataFromSession, JourneyResponse, list } from '@planning-inspectorate/dynamic-forms';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getQuestions } from './questions.ts';
import { getOptionalStringParams, getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { VIEW_TAB_ID, VIEW_TABS } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { s62aCaseToViewModel, type S62aCaseViewModel } from './view-model.ts';
import { isUnsafeObjectKey } from '@pins/crowndev-lib/util/session.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { S62A_VIEW_SELECT_INCLUDE } from './constants.ts';
import { combineSessionAndDbData } from '@pins/crowndev-lib/util/merge-data.ts';
import type { NextFunction, Request, Response } from 'express';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';

export function buildViewCaseDetails(): AsyncRequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		const reference = getStringParam(res?.locals?.journeyResponse?.answers, 'reference');
		const applicationPhase = getStringParam(res?.locals?.journeyResponse?.answers, 'applicationPhaseId');
		const banner = getBannerMessages(id, res, req);
		const baseUrl = req.baseUrl;

		// We clear the journey session on list page load to avoid ghost data.
		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		// Some tabs are hidden for the different phases
		const viewTabsToShow = VIEW_TABS.filter((tab) => tab.hide !== applicationPhase);

		await list(req, res, '', {
			caseId: id,
			reference,
			baseUrl,
			backLinkUrl: res.locals.backLinkUrl || '/s62a/cases',
			backLinkText: 'Back to all applications',
			currentUrl: req.originalUrl,
			currentTab: req.params.tab || VIEW_TAB_ID.OVERVIEW,
			viewTabs: viewTabsToShow,
			// URL without the /:tab slug, needed for routing uses in FE.
			cleanUrl: `/s62a/cases/${id}`,
			banner,
			foldersUrl: `/s62a/cases/${id}/case-folders`
		});
	};
}

export function buildGetJourneyMiddleware(service: ManageService, isQuestionView: boolean): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res, next) => {
		const id = getStringParam(req.params, 'id');
		const { section, manageListQuestion } = getOptionalStringParams(req.params, ['section', 'manageListQuestion']);

		logger.info({ id }, 'view S62A case');

		const s62aCase = await db.s62aCase.findUnique({
			include: S62A_VIEW_SELECT_INCLUDE,
			where: { id }
		});

		if (s62aCase === null) {
			return notFoundHandler(req, res);
		}

		const answers = s62aCaseToViewModel(s62aCase);
		const sessionAnswers = getJourneyAnswers(res);

		const finalAnswers = combineSessionAndDbData(answers, sessionAnswers);

		const questions = getQuestions(answers, isQuestionView);

		// @ts-expect-error - we haven't defined the view model on the locals object
		res.locals.originalAnswers = { ...answers };
		// @ts-expect-error - we haven't defined the view model on the locals object
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', finalAnswers);
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req);

		// set a back link to the case details page when viewing a section/question not within a manage list question
		if (section && !manageListQuestion) {
			res.locals.backLinkUrl = req.baseUrl;
		}

		// set a back link to the case details page when on an edit page
		if (!res.locals.backLinkUrl) {
			const originalUrl = typeof req.originalUrl === 'string' ? req.originalUrl : '';
			if (/\/edit\/?$/.test(originalUrl)) {
				res.locals.backLinkUrl = req.baseUrl;
			}
		}

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

/**
 * Get the journey answers
 */
function getJourneyAnswers(res: Response): S62aCaseViewModel | undefined {
	return res.locals.journeyResponse?.answers as unknown as S62aCaseViewModel;
}

/**
 * Validate the format of the id parameter
 */
export function validateIdFormat(req: Request, res: Response, next: NextFunction) {
	const id = getStringParam(req.params, 'id');

	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	next();
}

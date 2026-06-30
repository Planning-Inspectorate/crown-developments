import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { BOOLEAN_OPTIONS, clearDataFromSession, JourneyResponse, list } from '@planning-inspectorate/dynamic-forms';
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
import { getEntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import {
	getResidentialPrompt,
	getResidentialTotals,
	type ResidentialAnswers,
	residentialTotalAnswers
} from '../util/residential-totals.ts';
import { formatDateTime } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

export function buildViewCaseDetails(): AsyncRequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		const reference = getStringParam(res?.locals?.journeyResponse?.answers, 'reference');
		const applicationPhase = getStringParam(res?.locals?.journeyResponse?.answers, 'applicationPhaseId');
		const banner = getBannerMessages(id, res, req);
		const baseUrl = req.baseUrl;
		const lastModified = res.locals.lastModified as { updatedDate: string | null; by: string | null } | undefined;
		const lastModifiedDate = lastModified?.updatedDate ?? '-';
		const createdDate = res.locals.createdDate;

		// We clear the journey session on list page load to avoid ghost data.
		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		// Some tabs are hidden for the different phases
		const viewTabsToShow = VIEW_TABS.filter((tab) => tab.hide !== applicationPhase);

		await list(req, res, '', {
			caseId: id,
			reference,
			baseUrl,
			backLinkUrl: '/s62a/cases',
			backLinkText: 'Back to all cases',
			currentUrl: req.originalUrl,
			currentTab: req.params.tab || VIEW_TAB_ID.OVERVIEW,
			viewTabs: viewTabsToShow,
			// URL without the /:tab slug, needed for routing uses in FE.
			cleanUrl: `/s62a/cases/${id}`,
			banner,
			foldersUrl: `/s62a/cases/${id}/case-folders`,
			lastModifiedDate,
			createdDate
		});
	};
}

export function buildGetJourneyMiddleware(service: ManageService, isQuestionView: boolean): AsyncRequestHandler {
	const { db, logger, getEntraClient, audit } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res, next) => {
		const id = getStringParam(req.params, 'id');
		const { section, manageListQuestion, manageListItemId } = getOptionalStringParams(req.params, [
			'section',
			'manageListQuestion',
			'manageListItemId'
		]);

		logger.info({ id }, 'view S62A case');

		const s62aCase = await db.s62aCase.findUnique({
			include: S62A_VIEW_SELECT_INCLUDE,
			where: { id }
		});

		if (s62aCase === null) {
			return notFoundHandler(req, res);
		}

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		const answers = s62aCaseToViewModel(s62aCase);
		const sessionAnswers = getJourneyAnswers(res);

		const finalAnswers = combineSessionAndDbData(answers, sessionAnswers);

		// Derived after the merge so an entry added this session is counted, and
		// so a stale session copy of a total cannot win over the current figure.
		const residentialTotals = getResidentialTotals(finalAnswers);
		Object.assign(finalAnswers, residentialTotalAnswers(finalAnswers, residentialTotals));

		const lastModified = await audit.getLastModifiedInfo(id, groupMembers, CASE_DATA_MODEL.S62A);
		const createdDate = formatDateTime(s62aCase.createdDate);

		const questions = getQuestions(answers, {
			isQuestionView,
			groupMembers,
			manageListItemId,
			proposedHousing: finalAnswers.manageProposedHousing,
			existingHousing: finalAnswers.manageExistingHousing,
			residentialTotals
		});

		type QuestionBase = { fieldName?: string; title?: string };

		const fieldDisplayNames: Record<string, string> = Object.fromEntries(
			(Object.values(questions) as QuestionBase[])
				.filter((q): q is QuestionBase & { fieldName: string; title: string } => Boolean(q?.fieldName && q?.title))
				.map((q) => [q.fieldName, q.title])
		);

		res.locals.fieldDisplayNames = fieldDisplayNames;
		res.locals.createdDate = createdDate;

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

		res.locals.lastModified = lastModified;

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
	}

	if (req.params.tab === VIEW_TAB_ID.RESIDENTIAL) {
		const answers = getJourneyAnswers(res);
		const prompt = answers && residentialPromptMessage(answers, id);

		if (prompt) {
			bannerBuilder.addInfoTrustedSingleLineHtml(prompt);
		}
	}

	return bannerBuilder.build();
}

/**
 * The prompt for whichever residential side is still outstanding, when the
 * other side is known and so the net total is only one answer away. Null when
 * there's nothing to prompt for.
 */
export function residentialPromptMessage(answers: ResidentialAnswers, id: string): string | null {
	const side = getResidentialPrompt(getResidentialTotals(answers));
	if (!side) {
		return null;
	}

	// Skip the gating boolean when it's already answered - in that state the
	// side is outstanding because it has no entries, not because the question
	// is unanswered, so send the user straight to the add-to-list.
	const gateAnswered =
		(side === 'existing' ? answers.hasExistingHousing : answers.hasProposedHousing) === BOOLEAN_OPTIONS.YES;

	const sideUrl = `/s62a/cases/${id}/residential/${side}`;
	const href = gateAnswered ? `${sideUrl}/housing` : `${sideUrl}/has-${side}`;

	// id is a validated uuid and side is a literal, so the anchor is trusted.
	return `<a class="govuk-link" href="${href}">Add ${side} housing</a> to calculate Total net gain or loss of residential units`;
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

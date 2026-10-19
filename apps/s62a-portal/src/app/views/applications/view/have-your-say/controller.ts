import type { S62APortalService } from '#service';
import {
	type ApplicationPublishStatus,
	fetchPublishedS62aApplication,
	isWithdrawnOrExpired
} from '@pins/crowndev-lib/util/applications.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { formatDateForDisplay, nowIsWithinRange } from '@planning-inspectorate/dynamic-forms';
import type { Handler, Request, Response } from 'express';
import { s62aCaseToViewModel, type S62aCaseWithRelations, tabText } from '../view-model.ts';
import { JOURNEY_ID } from './journey.ts';

/** How long someone has to finish the journey, from selecting 'Start now' */
export const HAVE_YOUR_SAY_SESSION_LENGTH_MS = 24 * 60 * 60 * 1000;

/** Session field holding when each application's journey was started, see markHaveYourSayStarted */
const STARTED_SESSION_FIELD = 'haveYourSay';
const STARTED_AT = 'startedAt';
/** Session field the dynamic-forms session answer store keeps answers in */
const ANSWERS_SESSION_FIELD = 'forms';
/** Session field the upload question keeps uploaded attachments in, by question url */
const FILES_SESSION_FIELD = 'files';
const ATTACHMENTS_QUESTION_URL = 'attachments';

/**
 * The case details the Have your say pages need, stored on res.locals by buildLoadHaveYourSayCase
 */
export interface HaveYourSayCase {
	id: string;
	reference: string;
	representationsPeriodStartDate: Date | null;
	representationsPeriodEndDate: Date | null;
	representationsPublishDate: Date | null;
	applicationStatus: ApplicationPublishStatus | undefined;
}

/**
 * Whether people can submit a representation now. Uses the same rule as the
 * 'Have your say' tab in applicationLinks, so the tab and the pages agree.
 */
export function isHaveYourSayOpen(s62aCase: HaveYourSayCase): boolean {
	const start = s62aCase.representationsPeriodStartDate;
	const end = s62aCase.representationsPeriodEndDate;
	if (!start || !end) {
		return false;
	}
	if (isWithdrawnOrExpired(s62aCase.applicationStatus)) {
		return false;
	}
	return nowIsWithinRange(start, end);
}

/**
 * Whether the representation period has ended, for an application people could otherwise comment on
 */
export function hasHaveYourSayDeadlinePassed(s62aCase: HaveYourSayCase): boolean {
	const end = s62aCase.representationsPeriodEndDate;
	if (!s62aCase.representationsPeriodStartDate || !end) {
		return false;
	}
	if (isWithdrawnOrExpired(s62aCase.applicationStatus)) {
		return false;
	}
	return Date.now() > end.getTime();
}

/** res.locals is typed any, so cast once where the value enters */
function getHaveYourSayCase(res: Response): HaveYourSayCase | undefined {
	return res.locals.haveYourSayCase as HaveYourSayCase | undefined;
}

/**
 * Loads the case for every Have your say page. Returns a 404 when the id is invalid
 * or the application isn't published, and otherwise stores the case on
 * res.locals.haveYourSayCase.
 */
export function buildLoadHaveYourSayCase(service: S62APortalService): AsyncRequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const id = getStringParam(req.params, 'applicationId');

		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const s62aCase = await fetchPublishedS62aApplication({
			id,
			db,
			args: {
				include: {
					S62aDates: true
				}
			}
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		// We cast here because we know it will include a S62aDates join
		const { applicationStatus } = s62aCaseToViewModel(s62aCase as S62aCaseWithRelations);

		const haveYourSayCase: HaveYourSayCase = {
			id: s62aCase.id,
			reference: s62aCase.reference,
			representationsPeriodStartDate: s62aCase.representationsPeriodStartDate,
			representationsPeriodEndDate: s62aCase.representationsPeriodEndDate,
			representationsPublishDate: s62aCase.representationsPublishDate,
			applicationStatus
		};
		res.locals.haveYourSayCase = haveYourSayCase;
		callNext(next);
	};
}

/**
 * Returns a 404 unless the representation period is open. Used for the start page and 'Start now'.
 */
export function requireHaveYourSayOpen(): Handler {
	return (req, res, next) => {
		const s62aCase = getHaveYourSayCase(res);
		if (!s62aCase || !isHaveYourSayOpen(s62aCase)) {
			return notFoundHandler(req, res);
		}
		next();
	};
}

/**
 * Checks before every journey page:
 * - after the deadline, someone with a journey in progress sees 'You cannot submit this representation',
 *   and anyone else gets a 404
 * - more than 24 hours after 'Start now' (or with no start recorded) the answers are cleared
 *   and the person sees 'You need to start again'
 */
export function checkHaveYourSaySession(): Handler {
	return (req, res, next) => {
		const s62aCase = getHaveYourSayCase(res);
		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		if (!isHaveYourSayOpen(s62aCase)) {
			if (hasHaveYourSayDeadlinePassed(s62aCase) && isHaveYourSayInProgress(req, s62aCase.id)) {
				return renderDeadlinePassedPage(res, s62aCase);
			}
			return notFoundHandler(req, res);
		}

		if (hasHaveYourSaySessionExpired(req, s62aCase.id)) {
			clearHaveYourSaySession(req, s62aCase.id);
			return renderStartAgainPage(res, s62aCase);
		}

		next();
	};
}

/**
 * The 'You cannot submit this representation' page. Exported so the submit step can reuse it.
 */
export function renderDeadlinePassedPage(res: Response, s62aCase: HaveYourSayCase) {
	return res.render('views/applications/view/have-your-say/cannot-submit.njk', {
		pageCaption: s62aCase.reference,
		pageTitle: 'You cannot submit this representation',
		applicationUrl: applicationInformationUrl(s62aCase.id),
		representationDeadlineDate: formatDeadlineDate(s62aCase)
	});
}

function renderStartAgainPage(res: Response, s62aCase: HaveYourSayCase) {
	return res.render('views/applications/view/have-your-say/start-again.njk', {
		pageCaption: s62aCase.reference,
		pageTitle: 'You need to start again',
		applicationUrl: applicationInformationUrl(s62aCase.id),
		startUrl: `/applications/${s62aCase.id}/have-your-say/start`
	});
}

/**
 * The Have your say start page
 */
export function buildHaveYourSayPage(): Handler {
	return (req, res) => {
		const s62aCase = getHaveYourSayCase(res);
		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		const links = applicationLinks(
			s62aCase.id,
			{ start: s62aCase.representationsPeriodStartDate, end: s62aCase.representationsPeriodEndDate },
			s62aCase.representationsPublishDate,
			false,
			s62aCase.applicationStatus,
			tabText
		);

		return res.render('views/applications/view/have-your-say/view.njk', {
			pageCaption: s62aCase.reference,
			pageTitle: 'Have your say',
			links,
			currentUrl: req.originalUrl,
			startUrl: `/applications/${s62aCase.id}/have-your-say/start`,
			representationDeadlineDate: formatDeadlineDate(s62aCase)
		});
	};
}

/**
 * Starts the journey: records the start time, then goes to the first question.
 * Runs after the session has been reset, so any earlier answers are gone.
 */
export function startHaveYourSayJourney(): Handler {
	return (req, res) => {
		const s62aCase = getHaveYourSayCase(res);
		if (!s62aCase) {
			return notFoundHandler(req, res);
		}
		markHaveYourSayStarted(req, s62aCase.id);
		res.redirect(`${req.baseUrl}/start/who-submitting-for`);
	};
}

export function markHaveYourSayStarted(req: Request, applicationId: string, now = Date.now()) {
	addSessionData(req, applicationId, { [STARTED_AT]: now }, STARTED_SESSION_FIELD);
}

/**
 * Forgets that the journey was started, e.g. once it's been submitted
 */
export function clearHaveYourSayStarted(req: Request, applicationId: string) {
	clearSessionData(req, applicationId, STARTED_AT, STARTED_SESSION_FIELD);
}

/**
 * Expired when there's no recorded start (e.g. the session cookie has gone, or the page
 * was opened without selecting 'Start now'), or the start was more than 24 hours ago.
 */
export function hasHaveYourSaySessionExpired(req: Request, applicationId: string): boolean {
	const startedAt = readSessionData<number | undefined>(
		req,
		applicationId,
		STARTED_AT,
		undefined,
		STARTED_SESSION_FIELD
	);
	if (typeof startedAt !== 'number') {
		return true;
	}
	return Date.now() - startedAt > HAVE_YOUR_SAY_SESSION_LENGTH_MS;
}

function isHaveYourSayInProgress(req: Request, applicationId: string): boolean {
	const startedAt = readSessionData(req, applicationId, STARTED_AT, undefined, STARTED_SESSION_FIELD);
	const answers = readSessionData(req, applicationId, JOURNEY_ID, undefined, ANSWERS_SESSION_FIELD);
	return Boolean(startedAt || answers);
}

function clearHaveYourSaySession(req: Request, applicationId: string) {
	clearSessionData(req, applicationId, JOURNEY_ID, ANSWERS_SESSION_FIELD);
	clearSessionData(req, applicationId, STARTED_AT, STARTED_SESSION_FIELD);
	clearSessionData(req, applicationId, ATTACHMENTS_QUESTION_URL, FILES_SESSION_FIELD);
}

function applicationInformationUrl(applicationId: string) {
	return `/applications/${applicationId}/application-information`;
}

/** The ticket always shows the deadline as 11:59pm on the day the period ends */
function formatDeadlineDate(s62aCase: HaveYourSayCase) {
	return formatDateForDisplay(s62aCase.representationsPeriodEndDate ?? undefined, { format: 'd MMMM yyyy' });
}

/** AsyncRequestHandler types next as optional, but Express always passes it to middleware */
function callNext(next: ((err?: unknown) => void) | undefined) {
	if (!next) {
		throw new Error('Have your say middleware must be used as middleware');
	}
	next();
}

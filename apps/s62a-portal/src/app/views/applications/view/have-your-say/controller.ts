import type { S62APortalService } from '#service';
import {
	type ApplicationPublishStatus,
	fetchPublishedS62aApplication,
	isWithdrawnOrExpired
} from '@pins/crowndev-lib/util/applications.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';
import { nowIsWithinRange } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import type { Handler } from 'express';
import { s62aCaseToViewModel, type S62aCaseWithRelations, tabText } from '../view-model.ts';

/**
 * The case details the Have your say pages need, stored on res.locals by buildIsHaveYourSayOpen
 */
export interface HaveYourSayCase {
	id: string;
	reference: string;
	representationsPeriodStartDate: Date;
	representationsPeriodEndDate: Date;
	representationsPublishDate: Date | null;
	applicationStatus: ApplicationPublishStatus | undefined;
}

/**
 * Whether people can submit a representation now. Uses the same rule as the
 * 'Have your say' tab in applicationLinks, so the tab and the pages agree.
 */
export function isHaveYourSayOpen(
	period: { start: Date | null; end: Date | null },
	applicationStatus: ApplicationPublishStatus | undefined
): period is { start: Date; end: Date } {
	if (!period.start || !period.end) {
		return false;
	}
	if (isWithdrawnOrExpired(applicationStatus)) {
		return false;
	}
	return nowIsWithinRange(period.start, period.end);
}

/**
 * Runs before every Have your say page. Returns a 404 when the application isn't
 * published, or the representation period isn't open, and otherwise stores the
 * case on res.locals.haveYourSayCase.
 */
export function buildIsHaveYourSayOpen(service: S62APortalService): AsyncRequestHandler {
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
		const period = { start: s62aCase.representationsPeriodStartDate, end: s62aCase.representationsPeriodEndDate };

		if (!isHaveYourSayOpen(period, applicationStatus)) {
			return notFoundHandler(req, res);
		}

		const haveYourSayCase: HaveYourSayCase = {
			id: s62aCase.id,
			reference: s62aCase.reference,
			representationsPeriodStartDate: period.start,
			representationsPeriodEndDate: period.end,
			representationsPublishDate: s62aCase.representationsPublishDate,
			applicationStatus
		};
		res.locals.haveYourSayCase = haveYourSayCase;
		// AsyncRequestHandler types next as optional, but Express always passes it to middleware
		if (!next) {
			throw new Error('buildIsHaveYourSayOpen must be used as middleware');
		}
		next();
	};
}

/**
 * The Have your say start page
 */
export function buildHaveYourSayPage(): Handler {
	return (req, res) => {
		// res.locals is typed any, so cast once where the value enters
		const s62aCase = res.locals.haveYourSayCase as HaveYourSayCase | undefined;
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
			// The ticket always shows the deadline as 11:59pm on the day the period ends
			representationDeadlineDate: formatDateForDisplay(s62aCase.representationsPeriodEndDate, {
				format: 'd MMMM yyyy'
			})
		});
	};
}

/**
 * Starts the journey. The first question page arrives with the Myself ticket (PEAS-103),
 * so until then this redirect lands on a 404.
 */
export function startHaveYourSayJourney(): Handler {
	return (req, res) => {
		res.redirect(`${req.baseUrl}/start/who-submitting-for`);
	};
}

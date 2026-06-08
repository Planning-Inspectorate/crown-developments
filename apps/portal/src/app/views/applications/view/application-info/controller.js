import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { applicationLinks, applicationUpdateToTimelineItem, crownDevelopmentToViewModel } from '../view-model.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { fetchPublishedApplication, isExpired, isWithdrawnOrExpired } from '#util/applications.ts';
import { getHaveYourSayStatus } from '../have-your-say/util.js';
import {
	getAboutThisApplicationSectionItems,
	getApplicationDecisionSectionItems,
	getImportantDatesSectionItems,
	getProcedureDetailsSectionItems
} from './section-items.ts';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.ts';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { buildApplicationStages, getCurrentStage } from './application-stage/controller.js';
import { maybeGetLinkedCaseLink } from '@pins/crowndev-lib/util/linked-case.ts';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';

/**
 * @typedef {import('@pins/crowndev-lib/views/banner/banner-builder').BannerMessage} BannerMessage
 * @typedef {{latestApplicationUpdate: ReturnType<typeof applicationUpdateToTimelineItem>, isExpired: boolean}} GetBannerMessagesOptions
 */

/**
 * Get all banner messages to display.
 *
 * @param {import('express').Request} req
 * @param {import('#service').PortalService['db']} db
 * @param {CrownDevelopmentWithLinkedCase} crownDevelopment - Already-fetched crown development with parent/children relationships
 * @param {GetBannerMessagesOptions} options
 * @return {Promise<BannerMessage|null>}
 */
async function getBannerMessages(req, db, crownDevelopment, options) {
	const bannerBuilder = new BannerBuilder();

	const linkedCaseLink = await maybeGetLinkedCaseLink(db, crownDevelopment, 'portal');
	if (linkedCaseLink) {
		bannerBuilder.addLinkedCase(linkedCaseLink);
	}

	if (!options.isExpired && options.latestApplicationUpdate) {
		const html = `<h3 class="govuk-notification-banner__heading">Latest update &mdash; ${escapeHtml(options.latestApplicationUpdate.firstPublished)}</h3>
			<p class="govuk-body pins-pre-line">${escapeHtml(options.latestApplicationUpdate.details)}</p>
			<p><a class="govuk-notification-banner__link" href="${req.baseUrl}/application-updates">View all updates</a></p>`;
		bannerBuilder.addInfoTrustedHtml(html);
	}
	return bannerBuilder.build();
}

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildApplicationInformationPage(service) {
	const { db } = service;
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const crownDevelopment = await fetchPublishedApplication({
			id,
			db,
			args: {
				include: {
					ApplicantContact: { select: { orgName: true } },
					DecisionOutcome: { select: { displayName: true } },
					Lpa: true,
					SecondaryLpa: true,
					Type: true,
					SubType: true,
					SiteAddress: true,
					Event: true,
					Stage: { select: { displayName: true } },
					Procedure: { select: { displayName: true } },
					ParentCrownDevelopment: { select: { id: true } },
					ChildrenCrownDevelopment: { select: { id: true } },
					Organisations: { include: { Organisation: { select: { name: true } } } }
				}
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, service.contactEmail);

		/** @type {HaveYourSayPeriod} */
		const haveYourSayPeriod = {
			start: crownDevelopment.representationsPeriodStartDate,
			end: crownDevelopment.representationsPeriodEndDate
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;

		const {
			applicationAcceptedDate,
			decisionDate,
			decisionOutcome,
			hearingDate,
			hearingVenue,
			inquiryDate,
			inquiryProofsOfEvidenceDate,
			inquiryStatementsDate,
			inquiryVenue,
			procedure,
			representationsPeriodStartDateTime,
			representationsPeriodEndDateTime
		} = crownDevelopmentFields;
		const shouldShowImportantDatesSection = [
			applicationAcceptedDate,
			representationsPeriodStartDateTime && representationsPeriodEndDateTime,
			decisionDate
		].some(Boolean);
		const shouldShowApplicationDecisionSection = [decisionDate, decisionOutcome].some(Boolean);
		const shouldShowProcedureDetailsSection =
			Boolean(procedure) ||
			[inquiryDate, inquiryVenue, inquiryStatementsDate, inquiryProofsOfEvidenceDate].some(Boolean) ||
			[hearingDate, hearingVenue].some(Boolean);

		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);
		const latestApplicationUpdate = await db.applicationUpdate.findFirst({
			where: {
				applicationId: id,
				statusId: APPLICATION_UPDATE_STATUS_ID.PUBLISHED
			},
			select: {
				details: true,
				firstPublished: true
			},
			orderBy: {
				firstPublished: 'desc'
			}
		});
		const formattedApplicationStages = buildApplicationStages(crownDevelopment);
		const currentStage = getCurrentStage(formattedApplicationStages);
		const applicationStatus = crownDevelopmentFields.applicationStatus;

		const links = applicationLinks(
			id,
			haveYourSayPeriod,
			representationsPublishDate,
			displayApplicationUpdates,
			applicationStatus
		);

		const banner = await getBannerMessages(req, db, crownDevelopment, {
			latestApplicationUpdate: applicationUpdateToTimelineItem(latestApplicationUpdate),
			isExpired: isExpired(applicationStatus)
		});

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Application information',
			applicationReference: crownDevelopment.reference,
			isWithdrawn: isWithdrawnOrExpired(applicationStatus),
			isExpired: isExpired(applicationStatus),
			links,
			currentUrl: req.originalUrl,
			crownDevelopmentFields,
			banner,
			shouldShowImportantDatesSection,
			shouldShowProcedureDetailsSection,
			shouldShowApplicationDecisionSection,
			aboutThisApplicationSectionItems: getAboutThisApplicationSectionItems(req.baseUrl, crownDevelopmentFields),
			importantDatesSectionItems: getImportantDatesSectionItems(
				shouldShowImportantDatesSection,
				crownDevelopmentFields
			),
			procedureDetailsSectionItems: getProcedureDetailsSectionItems(
				shouldShowProcedureDetailsSection,
				crownDevelopmentFields
			),
			applicationDecisionSectionItems: getApplicationDecisionSectionItems(
				shouldShowApplicationDecisionSection,
				crownDevelopmentFields
			),
			haveYourSayStatus: getHaveYourSayStatus(haveYourSayPeriod, representationsPublishDate),
			applicationStageItems: {
				currentStage,
				formattedApplicationStages,
				formattedConsultationEndDate: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate, {
					format: 'eeee d MMMM yyyy'
				})
			}
		});
	};
}

import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { applicationLinks, applicationUpdateToTimelineItem, crownDevelopmentToViewModel } from '../view-model.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication, APPLICATION_PUBLISH_STATUS } from '#util/applications.js';
import { getHaveYourSayStatus } from '../have-your-say/util.js';
import {
	getAboutThisApplicationSectionItems,
	getApplicationDecisionSectionItems,
	getImportantDatesSectionItems,
	getProcedureDetailsSectionItems
} from './section-items.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { buildApplicationStages, getCurrentStage } from './application-stage/controller.js';
import {
	getLinkedCaseId,
	getLinkedCaseLinkText,
	hasLinkedCase,
	linkedCaseIsPublished
} from '@pins/crowndev-lib/util/linked-case.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { BannerBuilder } from '@pins/crowndev-lib/ui/banner/banner-builder.ts';
import nunjucks from 'nunjucks';

/**
 * @typedef {import('@pins/crowndev-lib/ui/banner/banner-builder').StandardBannerMessage} StandardBannerMessage
 * @typedef {{containsDistressingContent: boolean, latestApplicationUpdate: ReturnType<typeof applicationUpdateToTimelineItem>, isExpired: boolean}} GetBannerMessagesOptions
 */

/**
 * @param {import('express').Response} res
 * @param {import('express').Request} req
 * @param {import('#service').PortalService['db']} db
 * @param {GetBannerMessagesOptions} options
 * @return {Promise<StandardBannerMessage | null>}
 */
async function getBannerMessages(res, req, db, options) {
	const id = req.params.applicationId;
	if (!id || typeof id !== 'string') {
		throw new Error('id param required');
	}

	const bannerBuilder = new BannerBuilder();

	const crownDevelopment = await db.crownDevelopment.findUnique({
		where: { id },
		include: {
			ParentCrownDevelopment: { select: { id: true } },
			ChildrenCrownDevelopment: { select: { id: true } }
		}
	});

	const caseHasLinkedCase = hasLinkedCase(crownDevelopment);
	if (caseHasLinkedCase && crownDevelopment) {
		const linkedCaseLink = await getLinkedCaseLink(db, crownDevelopment);
		bannerBuilder.addLinkedCase(linkedCaseLink);
	}
	if (options.containsDistressingContent) {
		bannerBuilder.addDistressingContent();
	}
	if (!options.isExpired && options.latestApplicationUpdate) {
		bannerBuilder.addInfoHtml(
			nunjucks.render('ui/banner/views/banner-latest-update.njk', {
				latestApplicationUpdate: options.latestApplicationUpdate,
				baseUrl: req.baseUrl
			})
		);
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
					ChildrenCrownDevelopment: { select: { id: true } }
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
		const applicationStatus = crownDevelopment.applicationStatus;
		const isWithdrawn =
			applicationStatus === APPLICATION_PUBLISH_STATUS.WITHDRAWN ||
			applicationStatus === APPLICATION_PUBLISH_STATUS.EXPIRED;
		const isExpired = applicationStatus === APPLICATION_PUBLISH_STATUS.EXPIRED;

		const links = applicationLinks(
			id,
			haveYourSayPeriod,
			representationsPublishDate,
			displayApplicationUpdates,
			applicationStatus,
			true
		);

		const banner = await getBannerMessages(res, req, db, {
			containsDistressingContent: crownDevelopmentFields.containsDistressingContent,
			latestApplicationUpdate: applicationUpdateToTimelineItem(latestApplicationUpdate),
			isExpired: isExpired
		});

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Application information',
			applicationReference: crownDevelopment.reference,
			isWithdrawn,
			isExpired,
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
			hasLinkedCase: hasLinkedCase(crownDevelopment) && (await linkedCaseIsPublished(db, crownDevelopment)),
			linkedCaseLink: await getLinkedCaseLink(db, crownDevelopment),
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

async function getLinkedCaseLink(db, crownDevelopment) {
	if (hasLinkedCase(crownDevelopment)) {
		return `<a href="/applications/${getLinkedCaseId(crownDevelopment)}/application-information" class="govuk-link govuk-link--no-visited-state">${await getLinkedCaseLinkText(db, crownDevelopment)} application</a>`;
	}
}

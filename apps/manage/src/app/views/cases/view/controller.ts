import {
	list,
	JourneyResponse,
	dateIsBeforeToday,
	dateIsToday,
	clearDataFromSession,
	yesNoToBoolean
} from '@planning-inspectorate/dynamic-forms';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { crownDevelopmentToViewModel, mapNotes, type CrownDevelopmentViewModel } from './view-model.ts';
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { isUnsafeObjectKey, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { maybeGetLinkedCaseLink } from '@pins/crowndev-lib/util/linked-case.ts';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { filteredStagesToRadioOptions } from './question-utils.js';
import { getApplicantOrganisationOptions } from '../util/applicant-organisation-options.js';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import { CROWN_DEVELOPMENT_LINKED_CASE_SELECT, CROWN_DEVELOPMENT_VIEW_INCLUDE } from './payload-contracts.ts';
import type { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import type { Response, Request, Handler, NextFunction } from 'express';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import type { ManageService } from '#service';
import type { CrownJourneyResponse } from '../../../../types/express-locals.d.ts';
import { getOptionalStringParams, getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { combineSessionAndDbData } from '@pins/crowndev-lib/util/merge-data.ts';

/**
 * Get the journey answers
 */
function getJourneyAnswers(res: Response): CrownDevelopmentViewModel | undefined {
	return res.locals.journeyResponse?.answers;
}

/**
 * Get the HTML for a banner to show if the case is in an invalid state, e.g. missing required information.
 */
export function getInvalidStateBannerHtml(
	crownDevelopmentView: CrownDevelopmentViewModel,
	options: { relatedFieldUpdated?: boolean }
): string | null {
	const applicantOrgs = crownDevelopmentView.manageApplicantDetails;
	const applicantContacts = crownDevelopmentView.manageApplicantContactDetails;
	const orgsWithoutContacts = applicantOrgs?.filter((org) => {
		const hasContact = applicantContacts?.some((contact) => contact.applicantContactOrganisation === org.id);
		return !hasContact;
	});

	const agentOrganisationName = crownDevelopmentView.agentOrganisationName;
	const agentContacts = crownDevelopmentView.manageAgentContactDetails;

	/**
	 * Banner text depends on whether the relevant field has just been updated or not.
	 */
	const applicantContactText = options.relatedFieldUpdated
		? 'You need to add'
		: 'This application is missing information';

	const missingInfo: string[] = [];

	/**
	 * If no agent, each applicant organisation must have at least one contact.
	 */
	if (orgsWithoutContacts && orgsWithoutContacts.length > 0 && crownDevelopmentView.hasAgent === 'no') {
		orgsWithoutContacts.forEach((org) => {
			missingInfo.push(`Applicant contact for ${escapeHtml(org.organisationName)}`);
		});
	}

	/**
	 * If case has agent, agent organisation is required
	 */
	if (crownDevelopmentView.hasAgent === 'yes' && !agentOrganisationName) {
		missingInfo.push('Agent organisation name');
	}

	/**
	 * If case has agent, at least one agent contact is required
	 */
	if (crownDevelopmentView.hasAgent === 'yes' && (!agentContacts || agentContacts.length === 0)) {
		missingInfo.push('Agent contact');
	}

	if (missingInfo.length === 0) {
		return null;
	}

	return `<p class="govuk-body">${applicantContactText}:</p>
			<ul class="govuk-list govuk-list--bullet">
			<li>${missingInfo.join('</li><li>')}</li>
			</ul>`;
}

/**
 * Get all banner messages to display.
 */
async function getBannerMessages(id: string, res: Response, req: Request, db: ManageService['db']) {
	// Don't show success or info if there is an error
	if (res.locals.errorSummary) {
		return null;
	}

	const bannerBuilder = new BannerBuilder();

	const crownDevelopmentForLinkedCase = await db.crownDevelopment.findUnique({
		where: { id },
		select: CROWN_DEVELOPMENT_LINKED_CASE_SELECT
	});

	if (!crownDevelopmentForLinkedCase) {
		return null;
	}

	const linkedCaseLink = await maybeGetLinkedCaseLink(db, crownDevelopmentForLinkedCase, 'manage');
	if (linkedCaseLink) {
		bannerBuilder.addLinkedCase(linkedCaseLink);
	}

	const publishDate = res.locals?.journeyResponse?.answers?.publishDate;
	const casePublished = publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate));
	const successParam = req.query.success;
	const casePublishSuccess = successParam === 'published' && casePublished;
	if (casePublishSuccess) {
		bannerBuilder.addSuccessText('Application published');
		return bannerBuilder.build();
	}

	const caseUnpublishSuccess = successParam === 'unpublish' && !casePublished;
	if (caseUnpublishSuccess) {
		bannerBuilder.addSuccessText('Application unpublished');
		return bannerBuilder.build();
	}

	const crownDevelopmentView = res.locals.originalAnswers;

	const agentStatusUpdated = readSessionData(req, id, 'agentStatusUpdated', false);
	const applicantOrgAdded = readSessionData(req, id, 'applicantOrgAdded', false);

	if (crownDevelopmentView) {
		const invalidStateBannerHtml = getInvalidStateBannerHtml(crownDevelopmentView, {
			relatedFieldUpdated: agentStatusUpdated || (applicantOrgAdded && crownDevelopmentView.hasAgent === 'no')
		});
		if (invalidStateBannerHtml) {
			bannerBuilder.addInfoTrustedHtml(invalidStateBannerHtml);
		}
	}

	clearSessionData(req, id, 'agentStatusUpdated');
	clearSessionData(req, id, 'applicantOrgAdded');

	// immediately clear this so the banner only shows once
	const caseUpdated = readCaseUpdatedSession(req, id);
	clearCaseUpdatedSession(req, id);
	clearAllSessionData(req, res, id);

	if (caseUpdated) {
		bannerBuilder.addSuccessText('Application has been updated.');

		if (casePublished) {
			bannerBuilder.addSuccessText('Any updates made to this case will be automatically published.');
		}
		return bannerBuilder.build();
	}

	return bannerBuilder.build();
}

/**
 * Controller for the case details page, which shows the case summary and the list of sections to manage.
 */
export function buildViewCaseDetails({ db, getSharePointDrive, isCaseNotesLive }: ManageService): Handler {
	return async (req, res) => {
		const reference = getJourneyAnswers(res)?.reference;
		if (!reference) {
			throw new Error('Reference not found in journey answers');
		}

		const id = getStringParam(req.params, 'id');

		// Show publish case validation errors
		const errors = readSessionData<ErrorSummaryItem[]>(req, id, 'publishErrors', [], 'cases');
		if (errors && errors.length > 0) {
			res.locals.errorSummary = errors;
		}
		clearSessionData(req, id, 'publishErrors', 'cases');

		const publishDate = getJourneyAnswers(res)?.publishDate;
		const casePublished = publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate));
		const baseUrl = req.baseUrl;

		const banner = await getBannerMessages(id, res, req, db);
		const notes = res.locals.caseNotes ?? [];
		const allCaseNotesCount = res.locals.allCaseNotesCount ?? 0;
		const lastModified = res.locals.lastModified as { updatedDate: string | null; by: string | null } | undefined;
		const lastModifiedDate = lastModified?.updatedDate ?? '-';
		const lastModifiedBy = lastModified?.by ?? '-';
		const sharePointDrive = getSharePointDrive(req.session);
		let sharePointLink: string | undefined;
		if (sharePointDrive) {
			sharePointLink = await getSharePointFolderLink(sharePointDrive, caseReferenceToFolderName(reference));
		}

		await list(req, res, '', {
			reference,
			casePublished,
			baseUrl,
			sharePointLink,
			hideButton: true,
			hideStatus: true,
			isCaseNotesLive,
			banner,
			notes,
			allCaseNotesCount,
			lastModifiedDate,
			lastModifiedBy
		});
	};
}

/**
 * Wrap the sharepoint call to catch SharePoint errors
 */
async function getSharePointFolderLink(sharePointDrive: SharePointDrive, path: string): Promise<string | undefined> {
	try {
		const item = await sharePointDrive.getDriveItemByPath(path, [['$select', 'webUrl']]);
		return item.webUrl ?? undefined;
	} catch {
		// just don't show the button, don't throw an error
	}
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
		return; // no need to error here
	}

	if (isUnsafeObjectKey(id)) {
		throw new Error('Unsafe object key detected');
	}

	const caseProps = (req.session?.cases && req.session.cases[id]) || {};
	delete caseProps.updated;
}

/**
 * Fetch the case details from the database to create the journey
 *
 * @param service
 * @param isQuestionView - whether this journey is for a question page (true) or the case details page (false).
 */
export function buildGetJourneyMiddleware(service: ManageService, isQuestionView: boolean = false): Handler {
	const { db, logger, getEntraClient, audit } = service;
	const groupIds = service.entraGroupIds;

	return async (req: Request, res: Response, next: NextFunction) => {
		const id = getStringParam(req.params, 'id');
		const { section, manageListQuestion } = getOptionalStringParams(req.params, ['section', 'manageListQuestion']);

		logger.info({ id }, 'view case');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: CROWN_DEVELOPMENT_VIEW_INCLUDE
		});
		if (crownDevelopment === null) {
			return notFoundHandler(req, res);
		}
		const viewModel = crownDevelopmentToViewModel(crownDevelopment);
		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});
		if (service.isCaseNotesLive) {
			const mappedNotes = mapNotes(crownDevelopment.Notes ?? [], groupMembers, id);
			res.locals.caseNotes = mappedNotes.caseNotes;
			res.locals.allCaseNotesCount = crownDevelopment._count?.Notes ?? 0;
		}
		const lastModified = await audit.getLastModifiedInfo(id, groupMembers);
		const overrides = {
			isApplicationTypePlanningOrLbc: viewModel.typeId === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT,
			isApplicationSubTypeLbc: viewModel.subTypeId === APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT,
			filteredStageOptions: filteredStagesToRadioOptions(viewModel.procedureId),
			applicantOrganisationOptions: getApplicantOrganisationOptions(viewModel.manageApplicantDetails || []),
			hasAgentAnswer: yesNoToBoolean(viewModel.hasAgent),
			isQuestionView: isQuestionView
		};

		const questions = getQuestions(groupMembers, overrides);

		const sessionAnswers = getJourneyAnswers(res);

		const finalAnswers = combineSessionAndDbData(viewModel, sessionAnswers);

		// put these on locals for the list controller
		res.locals.originalAnswers = { ...viewModel };
		// We must cast to CrownJourneyResponse here as we define journeyResponse as a CrownJourneyResponse in a declaration module.
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', finalAnswers) as CrownJourneyResponse;
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req);

		// set a back link to the case details page when viewing a section/question not within a manage list question
		// e.g. /cases/:id/:section/:question and not /cases/:id/:section/:question/:manageListAction/:manageListItemId/:manageListQuestion
		if (section && !manageListQuestion) {
			res.locals.backLinkUrl = req.baseUrl;
		}

		// set a back link to the case details page when on an edit page
		// e.g. /cases/:id/edit
		if (!res.locals.backLinkUrl) {
			const originalUrl = typeof req.originalUrl === 'string' ? req.originalUrl : '';
			if (/\/edit\/?$/.test(originalUrl)) {
				res.locals.backLinkUrl = req.baseUrl;
			}
		}

		res.locals.lastModified = lastModified;

		next();
	};
}

/**
 * Clears the session data for the Journey as well
 * as for any specifically added session data like
 * error flags.
 */
function clearAllSessionData(req: Request, res: Response, id: string) {
	// We clear the journey session to avoid ghost data from partially saved answers
	clearDataFromSession({ req, journeyId: JOURNEY_ID });

	// Clear updated flag if present so that we only see it once.
	clearSessionData(req, id, 'updated');

	const errors = readSessionData<ErrorSummaryItem[]>(req, id, 'updateErrors', [], 'cases');
	if (errors && errors.length > 0) {
		res.locals.errorSummary = [...(res.locals.errorSummary ?? []), ...errors];
	}
	clearSessionData(req, id, 'updateErrors', 'cases');
}

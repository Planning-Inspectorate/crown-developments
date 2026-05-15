import {
	list,
	JourneyResponse,
	dateIsBeforeToday,
	dateIsToday,
	clearDataFromSession,
	yesNoToBoolean
} from '@planning-inspectorate/dynamic-forms';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel } from './view-model.js';
import { getQuestions } from './questions.js';
import { createJourney, createJourneyV2, JOURNEY_ID } from './journey.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getLinkedCaseId, getLinkedCaseLinkText, hasLinkedCase } from '@pins/crowndev-lib/util/linked-case.ts';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { filteredStagesToRadioOptions } from './question-utils.js';
import { getApplicantOrganisationOptions } from '../util/applicant-organisation-options.js';
import type { CrownDevelopmentViewModel, CrownJourneyAnswers } from './types.d.ts';
import type { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import type { Prisma } from '@pins/crowndev-database/src/client/client.js';
import type { Response, Request, Handler, NextFunction } from 'express';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import type { ManageService } from '#service';

/**
 * Get the journey answers typed as a subset of CrownDevelopmentViewModel
 */
function getJourneyAnswers(res: Response): CrownJourneyAnswers | undefined {
	const journeyResponse = res.locals.journeyResponse as { answers: CrownJourneyAnswers | undefined };
	return journeyResponse?.answers;
}

type CrownDevelopmentWithLinkedCase = Prisma.CrownDevelopmentGetPayload<{
	include: {
		ParentCrownDevelopment: { select: { id: true } };
		ChildrenCrownDevelopment: { select: { id: true } };
	};
}>;

/**
 * Controller for the case details page, which shows the case summary and the list of sections to manage.
 */
export function buildViewCaseDetails({ db, getSharePointDrive, isApplicationUpdatesLive }: ManageService): Handler {
	return async (req, res) => {
		const reference = getJourneyAnswers(res)?.reference;
		if (!reference) {
			throw new Error('Reference not found in journey answers');
		}

		const id = req.params.id;
		if (!id || typeof id !== 'string') {
			throw new Error('id param required');
		}

		// Show publish case validation errors
		const errors = readSessionData<ErrorSummaryItem[]>(req, id, 'publishErrors', [], 'cases');
		if (errors && errors.length > 0) {
			res.locals.errorSummary = errors;
		}
		clearSessionData(req, id, 'publishErrors', 'cases');

		// immediately clear this so the banner only shows once
		const caseUpdated = readCaseUpdatedSession(req, id);
		clearCaseUpdatedSession(req, id);
		clearAllSessionData(req, res, id);

		const publishDate = getJourneyAnswers(res)?.publishDate;
		const casePublished = publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate));
		const baseUrl = req.baseUrl;
		const successParam = req.query.success;
		const casePublishSuccess = successParam === 'published' && casePublished;
		const caseUnpublishSuccess = successParam === 'unpublish' && !casePublished;
		const sharePointDrive = getSharePointDrive(req.session);
		let sharePointLink: string | undefined;
		if (sharePointDrive) {
			sharePointLink = await getSharePointFolderLink(sharePointDrive, caseReferenceToFolderName(reference));
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ParentCrownDevelopment: { select: { id: true } },
				ChildrenCrownDevelopment: { select: { id: true } }
			}
		});

		await list(req, res, '', {
			reference,
			caseUpdated,
			casePublished,
			casePublishSuccess,
			caseUnpublishSuccess,
			baseUrl,
			sharePointLink,
			hideButton: true,
			hideStatus: true,
			isApplicationUpdatesLive,
			hasLinkedCase: hasLinkedCase(crownDevelopment),
			linkedCaseLink: await maybeGetLinkedCaseLink(db, crownDevelopment)
		});
	};
}

/**
 * Get the linked case link HTML
 */
async function maybeGetLinkedCaseLink(
	db: ManageService['db'],
	crownDevelopment: CrownDevelopmentWithLinkedCase | null | undefined
): Promise<string | undefined> {
	if (!hasLinkedCase(crownDevelopment)) {
		return undefined;
	}

	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	if (!linkedCaseId) {
		return undefined;
	}

	return `<a href="/cases/${linkedCaseId}" class="govuk-link govuk-link--no-visited-state">${await getLinkedCaseLinkText(db, crownDevelopment)} application</a>`;
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
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	next();
}

/**
 * Read a case updated flag from the session
 */
export function readCaseUpdatedSession(req: Request, id: string): boolean {
	if (!req.session) {
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
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req: Request, res: Response, next: NextFunction) => {
		const { id, section, manageListQuestion } = req.params;
		if (!id || typeof id !== 'string') {
			throw new Error('id param required');
		}
		logger.info({ id }, 'view case');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ApplicantContact: { include: { Address: true } },
				AgentContact: { include: { Address: true } },
				Category: { include: { ParentCategory: true } },
				Event: true,
				Lpa: { include: { Address: true } },
				SecondaryLpa: { include: { Address: true } },
				SiteAddress: true,
				ParentCrownDevelopment: { select: { reference: true } },
				ChildrenCrownDevelopment: { select: { reference: true } },
				Organisations: {
					include: {
						Organisation: {
							include: {
								Address: true,
								OrganisationToContact: {
									include: {
										Contact: { include: { Address: true } }
									}
								}
							}
						}
					}
				}
			}
		});
		if (crownDevelopment === null) {
			return notFoundHandler(req, res);
		}
		const answers = crownDevelopmentToViewModel(crownDevelopment);
		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});
		const overrides = {
			isApplicationTypePlanningOrLbc: answers.typeId === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT,
			isApplicationSubTypeLbc: answers.subTypeId === APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT,
			filteredStageOptions: filteredStagesToRadioOptions(answers.procedureId),
			applicantOrganisationOptions: getApplicantOrganisationOptions(answers.manageApplicantDetails || []),
			hasAgentAnswer: yesNoToBoolean(answers.hasAgent),
			isQuestionView: isQuestionView
		};

		const questions = getQuestions(groupMembers, overrides);

		const finalAnswers = combineSessionAndDbData(res, answers);

		// put these on locals for the list controller
		res.locals.originalAnswers = { ...answers };
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', finalAnswers);
		res.locals.journey = service.isMultipleApplicantsLive
			? createJourneyV2(questions, res.locals.journeyResponse, req)
			: createJourney(questions, res.locals.journeyResponse, req);

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

		next();
	};
}

/**
 * Combine session answers with DB answers
 *
 * Session answers take precedence unless they are undefined or null.
 * For array answers (e.g. manage list questions), the arrays are merged
 * such that items with matching IDs are merged together to preserve
 * any unchanged data from the DB.
 */
export function combineSessionAndDbData(res: Response, answers: CrownDevelopmentViewModel): CrownDevelopmentViewModel {
	const finalAnswers = { ...answers };
	const sessionAnswers = getJourneyAnswers(res);
	if (!sessionAnswers || Object.keys(sessionAnswers).length === 0) return finalAnswers;

	(Object.keys(sessionAnswers) as Array<keyof CrownDevelopmentViewModel>).forEach((key) => {
		setAnswer(finalAnswers, key, mergeAnswerValue(answers[key], sessionAnswers[key]));
	});

	return finalAnswers;
}

/**
 * Helper to set an answer value with the correct type
 */
function setAnswer<K extends keyof CrownDevelopmentViewModel>(
	answers: CrownDevelopmentViewModel,
	key: K,
	value: CrownDevelopmentViewModel[K]
): void {
	answers[key] = value;
}

/**
 * Helper to determine if an answer is an array of objects that can be merged by ID
 */
function isMergeableAnswerArray(value: unknown): value is Array<{ id?: PropertyKey | null } & object> {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				item !== null &&
				typeof item === 'object' &&
				!Array.isArray(item) &&
				Object.prototype.hasOwnProperty.call(item, 'id')
		)
	);
}

/**
 * Helper to merge a DB answer value with a session answer value
 */
function mergeAnswerValue<K extends keyof CrownDevelopmentViewModel>(
	dbValue: CrownDevelopmentViewModel[K],
	sessionValue: CrownJourneyAnswers[K]
): CrownDevelopmentViewModel[K] {
	if (sessionValue === undefined || sessionValue === null) {
		return dbValue;
	}

	if (isMergeableAnswerArray(dbValue) && isMergeableAnswerArray(sessionValue)) {
		return mergeArraysById(dbValue, sessionValue) as CrownDevelopmentViewModel[K];
	}

	return sessionValue;
}

/**
 * Helper to merge two arrays of objects
 *
 * If a session item has an ID that matches a DB item, it is merged with it to overwrite the different keys.
 * If no match is found, it is appended as a new item.
 */
export function mergeArraysById<T extends { id?: PropertyKey | null }>(dbArray: T[], sessionArray: T[]): T[] {
	const merged = [...dbArray];

	sessionArray.forEach((sessionItem) => {
		const existingIndex = merged.findIndex((dbItem) => dbItem.id && sessionItem.id && dbItem.id === sessionItem.id);

		if (existingIndex !== -1) {
			// If not found (-1) spread the two items together such that the new session data overwrites the key
			merged[existingIndex] = { ...merged[existingIndex], ...sessionItem };
		} else {
			merged.push(sessionItem);
		}
	});

	return merged;
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

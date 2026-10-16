import { getOptionalStringParams, getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Journey, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { type GroupMemberPageState, MAXIMUM_GROUP_MEMBERS } from './questions.ts';

/** The group's add-to-list question, 'Check group name details' */
const GROUP_LIST_URL = 'check-group-name-details';
const GROUP_LIST_FIELD = 'manageGroupDetails';

function getGroupMembers(answers: Record<string, unknown> | undefined): { id?: unknown }[] {
	const members = answers?.[GROUP_LIST_FIELD];
	return Array.isArray(members) ? (members as { id?: unknown }[]) : [];
}

function getManageListParams(req: Request) {
	return getOptionalStringParams(req.params, ['manageListAction', 'manageListItemId']);
}

/**
 * Where this request is in the group's add-to-list: adding or changing, and how many other people are in the group
 */
export function getGroupMemberPageState(req: Request, journeyResponse: JourneyResponse): GroupMemberPageState {
	const { manageListAction, manageListItemId } = getManageListParams(req);
	// answers is typed any upstream
	const answers = journeyResponse.answers as Record<string, unknown> | undefined;
	const otherMembers = getGroupMembers(answers).filter((member) => member.id !== manageListItemId).length;
	return { manageListAction: manageListAction ?? undefined, otherMembers };
}

/**
 * Stops a new person being added once the group is full, by sending them back to the list.
 * The add link is already hidden at the limit; this covers a typed or old add URL.
 */
export function limitGroupMembers(req: Request, res: Response, next: NextFunction) {
	const { manageListAction, manageListItemId } = getManageListParams(req);
	if (req.params.question !== GROUP_LIST_URL || manageListAction !== MANAGE_LIST_ACTIONS.ADD) {
		return next();
	}
	// res.locals is typed any, so cast once where the value enters
	const journeyResponse = res.locals.journeyResponse as JourneyResponse | undefined;
	const members = getGroupMembers(journeyResponse?.answers);
	const isNewMember = !members.some((member) => member.id === manageListItemId);
	if (isNewMember && members.length >= MAXIMUM_GROUP_MEMBERS) {
		return res.redirect(`${req.baseUrl}/${getStringParam(req.params, 'section')}/${GROUP_LIST_URL}`);
	}
	next();
}

/**
 * With no-one added yet, the group skips its empty list and goes straight to the first person page,
 * whose back link then goes to the page before the list (so Back does not loop into this redirect).
 * Runs after getJourney. The redirect is for GETs; on a POST only the back link is set, for error pages.
 */
export function goStraightToFirstGroupMember(req: Request, res: Response, next: NextFunction) {
	if (req.params.question !== GROUP_LIST_URL) {
		return next();
	}
	// res.locals is typed any, so cast once where the values enter
	const journey = res.locals.journey as Journey;
	const journeyResponse = res.locals.journeyResponse as JourneyResponse;
	const { manageListAction, manageListItemId } = getManageListParams(req);
	const otherMembers = getGroupMembers(journeyResponse.answers as Record<string, unknown> | undefined).filter(
		(member) => member.id !== manageListItemId
	);
	if (otherMembers.length > 0) {
		return next();
	}

	const section = getStringParam(req.params, 'section');
	const listParams = { section, question: GROUP_LIST_URL };
	if (!manageListAction && req.method === 'GET') {
		const list = journey.getQuestionByParams(listParams) as { section?: { questions: { url: string }[] } } | undefined;
		const firstQuestionUrl = list?.section?.questions[0]?.url;
		if (!firstQuestionUrl) {
			return next();
		}
		// a new item id, as the library's own 'add another' link uses; nothing is saved until the person page is submitted
		const listUrl = `${req.baseUrl}/${section}/${GROUP_LIST_URL}`;
		return res.redirect(`${listUrl}/${MANAGE_LIST_ACTIONS.ADD}/${randomUUID()}/${firstQuestionUrl}`);
	}
	if (manageListAction === MANAGE_LIST_ACTIONS.ADD) {
		// this journey is built for this request only, so changing it here affects no other request
		const backLink = journey.getBackLink({ params: listParams });
		journey.getBackLink = () => backLink;
	}
	next();
}

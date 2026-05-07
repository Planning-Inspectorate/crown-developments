import { getAnswers } from '@pins/crowndev-lib/util/answers.js';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Response } from 'express';

interface CrownDevelopmentWithLinkedCase {
	linkedParentId?: string | null;
	ChildrenCrownDevelopment?: { id: string }[];
}

/**
 * Get the ID of the linked case, if there is one. This will be either the parent or the child, depending on which one is the current case.
 */
export function getLinkedCaseId(
	crownDevelopment: CrownDevelopmentWithLinkedCase | null | undefined
): string | undefined {
	return crownDevelopment?.linkedParentId || crownDevelopment?.ChildrenCrownDevelopment?.find(() => true)?.id;
}

/**
 * Does the current case have a linked case (either parent or child)?
 */
export function hasLinkedCase(crownDevelopment: CrownDevelopmentWithLinkedCase | null | undefined): boolean {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	return typeof linkedCaseId === 'string' && linkedCaseId.trim() !== '';
}

/**
 * Is the linked case published? This checks if the linked case has a publish date in the past or today.
 */
export async function linkedCaseIsPublished(
	db: PrismaClient,
	crownDevelopment: CrownDevelopmentWithLinkedCase | null | undefined
): Promise<boolean> {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	const linkedCase = await db.crownDevelopment.findUnique({
		where: { id: linkedCaseId },
		select: { publishDate: true }
	});
	const publishDate = linkedCase?.publishDate;
	return Boolean(publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate)));
}

/**
 * Get the link text for the linked case, based on its sub type.
 */
export async function getLinkedCaseLinkText(
	db: PrismaClient,
	crownDevelopment: CrownDevelopmentWithLinkedCase | null | undefined
): Promise<string> {
	const linkedCaseId = getLinkedCaseId(crownDevelopment);
	const linkedCase = await db.crownDevelopment.findUnique({
		where: { id: linkedCaseId },
		select: { subTypeId: true }
	});

	return linkedCase?.subTypeId === APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION
		? 'planning permission'
		: 'Listed Building Consent (LBC)';
}

/**
 * Get the warning message to show on the summary page if there is a linked case.
 */
export function getSummaryWarningMessage(res: Response): string {
	const answers = getAnswers(res);
	return answers?.typeOfApplication === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
		? 'Clicking accept & submit will create a second case as part of the connected application'
		: 'Clicking Accept & Submit will send a notification to the applicant / agent';
}

import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID,
	S62A_STATUS_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

type S62aCaseDb = Pick<PrismaClient, 's62aCase'>;

export interface PreApplicationCaseOption {
	text: string;
	value: string;
}

/**
 * True when advice was requested from PINS or the council, so a reference is needed
 */
export function isPreApplicationAdviceGiven(answer: unknown): boolean {
	return answer === PRE_APPLICATION_ADVICE_ID.PINS || answer === PRE_APPLICATION_ADVICE_ID.COUNCIL;
}

/**
 * Whether the pre-application tab applies to this case: always for a
 * pre-application, and for an application only once advice is recorded.
 */
export function showPreApplicationTab(answers?: {
	applicationPhaseId?: string | null;
	preApplicationAdviceId?: string | null;
}): boolean {
	if (!answers) return false;

	return (
		answers.applicationPhaseId === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION &&
		isPreApplicationAdviceGiven(answers.preApplicationAdviceId)
	);
}

/**
 * Pre-application cases that can be linked: not withdrawn, and not already linked to an application
 */
export function linkablePreApplicationWhere(currentCaseId?: string): Prisma.S62aCaseWhereInput {
	return {
		applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
		AND: [
			{ OR: [{ s62aStatusId: null }, { s62aStatusId: { not: S62A_STATUS_ID.WITHDRAWN } }] },
			{
				OR: [
					{ LinkedApplications: { none: {} } },
					...(currentCaseId ? [{ LinkedApplications: { some: { id: currentCaseId } } }] : [])
				]
			}
		]
	};
}

export async function getPreApplicationCaseOptions(
	db: S62aCaseDb,
	currentCaseId?: string
): Promise<PreApplicationCaseOption[]> {
	const cases = await db.s62aCase.findMany({
		where: linkablePreApplicationWhere(currentCaseId),
		select: { id: true, reference: true },
		orderBy: { reference: 'asc' }
	});
	return cases.map((c) => ({ value: c.id, text: c.reference }));
}

/**
 * Re-checks a selected pre-application at save time, in case it was withdrawn or
 * linked by someone else since the page loaded
 */
export async function isPreApplicationCaseLinkable(
	db: S62aCaseDb,
	preApplicationCaseId: string,
	currentCaseId?: string
): Promise<boolean> {
	const found = await db.s62aCase.findFirst({
		where: { id: preApplicationCaseId, ...linkablePreApplicationWhere(currentCaseId) },
		select: { id: true }
	});
	return found !== null;
}

import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export const QUESTION_TEXT = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: {
		applicationType: 'What type of application is this pre-application advice for?',
		localPlanningAuthority: 'Which local planning authority is this pre-application advice related to?',
		hasSecondaryLpa: 'Does this pre-application advice have a secondary local planning authority?',
		secondaryLocalPlanningAuthority:
			'Which secondary local planning authority is this pre-application advice related to?'
	},
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: {
		applicationType: 'What type of application is it?',
		localPlanningAuthority: 'Which local planning authority is this application related to?',
		hasSecondaryLpa: 'Does this application have a secondary local planning authority?',
		secondaryLocalPlanningAuthority: 'Which secondary local planning authority is this application related to?'
	}
};

export type AppType = (typeof PRE_APPLICATION_OR_APPLICATION_ID)[keyof typeof PRE_APPLICATION_OR_APPLICATION_ID];

/**
 * Checks to make sure answer is one of the two app types, for typescript
 */
export const isApplicationType = (answer: unknown): answer is AppType => {
	return (
		answer === PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION ||
		answer === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
	);
};

/**
 * Formats LPA list with null value first and unsorted LPAs as received
 * from file, ready for use as an options array.
 */
export const formatLpaOptions = (lpas: Prisma.LpaCreateInput[]) => {
	const lpaOptions = [{ text: '', value: '' }, ...lpas.map((t) => ({ text: t.name, value: t.id }))];
	return lpaOptions;
};

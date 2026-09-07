import { formatDateForDisplay, isNowAfterStartDate, nowIsWithinRange } from '@planning-inspectorate/dynamic-forms';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	isWithdrawnOrExpired,
	isExpired,
	type ApplicationPublishStatus
} from '@pins/crowndev-lib/util/applications.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export type ApplicationLink = {
	href: string;
	text: string;
};

export const formatDate = (date: Date | null | undefined, options?: { format?: string }): string =>
	formatDateForDisplay(date as Date | undefined, options);

export function isInquiry(procedureId: string | null): boolean {
	return procedureId === APPLICATION_PROCEDURE_ID.INQUIRY;
}

export function isHearing(procedureId: string | null): boolean {
	return procedureId === APPLICATION_PROCEDURE_ID.HEARING;
}

export interface BaseDevelopmentDbRecord {
	id: string;
	reference: string;
	description: string | null;
	Lpa?: { name?: string | null } | null;
	Stage?: { displayName?: string | null } | null;
	SecondaryLpa?: { name?: string | null } | null;
}

export type BaseDevelopmentView = {
	id: string;
	reference: string;
	developmentContactEmail: string | undefined;
	description: string | null;
	lpaName: string | undefined;
	stage: string | undefined;
	secondaryLpa: string | undefined;
};

export type ValidatedDbPayload<T extends BaseDevelopmentDbRecord> = T;

export const baseCrownDevelopmentSelect = {
	id: true,
	reference: true,
	description: true,
	Lpa: { select: { name: true } },
	Stage: { select: { displayName: true } },
	SecondaryLpa: { select: { name: true } }
} satisfies Prisma.CrownDevelopmentSelect;

export type BaseCrownDevelopmentPayload = ValidatedDbPayload<
	Prisma.CrownDevelopmentGetPayload<{ select: typeof baseCrownDevelopmentSelect }>
>;

export const baseS62ACaseSelect = {
	id: true,
	reference: true,
	description: true,
	Lpa: { select: { name: true } },
	Stage: { select: { displayName: true } },
	SecondaryLpa: { select: { name: true } }
} satisfies Prisma.S62aCaseSelect;

export type BaseS62ACasePayload = ValidatedDbPayload<Prisma.S62aCaseGetPayload<{ select: typeof baseS62ACaseSelect }>>;

/**
 * Higher Order Function to take database queries and prepare them for display as view models
 *
 * @param developmentData - The main db query input
 * @param contactEmail - The contact email associated with the app service
 * @param developmentFormattingFunction - Function required to modify the db query input for use in the view model
 */
export function mapDevelopmentToViewModel<
	T extends BaseDevelopmentDbRecord,
	E extends Record<string, unknown> = Record<string, never>
>(
	developmentData: T,
	contactEmail: string | undefined,
	developmentFormattingFunction?: (input: T) => E
): BaseDevelopmentView & E {
	const fields = {
		id: developmentData.id,
		reference: developmentData.reference,
		description: developmentData.description,
		developmentContactEmail: contactEmail,
		lpaName: developmentData.Lpa?.name ?? undefined,
		stage: developmentData.Stage?.displayName ?? undefined,
		secondaryLpa: developmentData.SecondaryLpa?.name ?? undefined
	};

	const extendedFields = developmentFormattingFunction ? developmentFormattingFunction(developmentData) : ({} as E);

	return { ...extendedFields, ...fields };
}

/**
 * Build the application navigation links for the various application view pages.
 */
export function applicationLinks(
	id: string,
	haveYourSayPeriod: { start: Date | null; end: Date | null },
	representationsPublishDate: Date | null,
	displayApplicationUpdates: boolean,
	applicationStatus: ApplicationPublishStatus | undefined = undefined
): ApplicationLink[] {
	const links = [
		{
			href: `/applications/${id}/application-information`,
			text: 'Application information'
		}
	];

	if (isExpired(applicationStatus)) {
		return links;
	}

	links.push({
		href: `/applications/${id}/documents`,
		text: 'Documents'
	});
	if (
		!isWithdrawnOrExpired(applicationStatus) &&
		haveYourSayPeriod?.start &&
		haveYourSayPeriod?.end &&
		nowIsWithinRange(haveYourSayPeriod?.start, haveYourSayPeriod?.end)
	) {
		links.push({
			href: `/applications/${id}/have-your-say`,
			text: 'Have your say'
		});
	}
	if (displayApplicationUpdates) {
		links.push({
			href: `/applications/${id}/application-updates`,
			text: 'Application updates'
		});
	}
	if (representationsPublishDate && isNowAfterStartDate(representationsPublishDate)) {
		links.push({
			href: `/applications/${id}/written-representations`,
			text: 'Written representations'
		});
	}

	return links;
}

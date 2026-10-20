import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { AnswerValidationError } from '@pins/crowndev-lib/util/types.ts';
import { APPLICANT_TYPE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export async function publishS62aCase(db: PrismaClient, id: string) {
	return db.s62aCase.update({
		where: { id },
		data: {
			S62aDates: {
				update: { publishDate: new Date() }
			}
		}
	});
}

export async function fetchS62aPublishCase(db: PrismaClient, id: string) {
	return await db.s62aCase.findUnique({
		where: { id },
		include: {
			Lpa: { include: { Address: true } },
			SiteAddress: true,
			S62aDates: true,
			S62aToApplicants: {
				include: {
					Organisation: true,
					Contact: true
				}
			}
		}
	});
}

export type FetchedS62aCase = Awaited<ReturnType<typeof fetchS62aPublishCase>>;

export function answerValidation(fetchedCase: NonNullable<FetchedS62aCase>, id: string): AnswerValidationError[] {
	// We only care about applicant contact types, not agents or anything else.
	const allApplicants = fetchedCase.S62aToApplicants?.filter((a) => a.roleId === 'applicant') || [];

	// Table is exclusive arc, so we need to split out into the two joins: direct contact or contact through org
	const individualApplicants = allApplicants.filter((a) => a.contactId);
	const orgApplicants = allApplicants.filter((a) => a.organisationId);

	return [
		{
			value: fetchedCase.S62aDates?.applicationValidDate,
			errorMessage: 'You must enter the date the application was confirmed as valid',
			pageLink: `/s62a/cases/${id}/dates`
		},
		{
			value: fetchedCase.SiteAddress?.postcode || (fetchedCase.siteEasting && fetchedCase.siteNorthing),
			errorMessage: 'You must enter site coordinates or postcode within the site address',
			pageLink: `/s62a/cases/${id}/overview`
		},
		{
			value:
				fetchedCase.applicantTypeId === APPLICANT_TYPE_ID.INDIVIDUAL
					? individualApplicants.length > 0 &&
						individualApplicants.every((applicant) => applicant.Contact?.firstName && applicant.Contact?.lastName)
					: true,
			errorMessage: 'You must enter the individual applicant contact name',
			pageLink: `/s62a/cases/${id}/contacts`
		},
		{
			value:
				fetchedCase.applicantTypeId === APPLICANT_TYPE_ID.ORGANISATION
					? orgApplicants.length > 0 && orgApplicants.every((applicant) => applicant.Organisation?.name)
					: true,
			errorMessage: 'You must enter the applicant organisation name',
			pageLink: `/s62a/cases/${id}/contacts`
		}
	];
}

export async function unpublishS62aCase(db: PrismaClient, id: string) {
	return db.s62aCase.update({
		where: { id },
		data: {
			S62aDates: {
				update: { publishDate: null }
			}
		}
	});
}

export async function fetchS62aUnpublishCase(db: PrismaClient, id: string) {
	return await db.s62aCase.findUnique({
		where: { id }
	});
}

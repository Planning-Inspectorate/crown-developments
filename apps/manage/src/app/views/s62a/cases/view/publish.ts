import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { AnswerValidationError } from '@pins/crowndev-lib/util/types.ts';

//Publish

export const publishS62aCase = (db: PrismaClient, id: string) => {
	return db.s62aCase.update({
		where: { id },
		data: {
			S62aDates: {
				update: { publishDate: new Date() }
			}
		}
	});
};

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
				fetchedCase.S62aToApplicants?.every((applicant) =>
					applicant.contactId ? Boolean(applicant.Contact?.firstName && applicant.Contact?.lastName) : true
				) ?? true,
			errorMessage: 'You must enter the individual applicant contact name',
			pageLink: `/s62a/cases/${id}/contacts`
		},
		{
			value:
				fetchedCase.S62aToApplicants?.every((applicant) =>
					applicant.organisationId ? Boolean(applicant.Organisation?.name) : true
				) ?? true,
			errorMessage: 'You must enter the applicant organisation name',
			pageLink: `/s62a/cases/${id}/contacts`
		}
	];
}

//Unpublish

export const unpublishS62aCase = (db: PrismaClient, id: string) => {
	return db.s62aCase.update({
		where: { id },
		data: {
			S62aDates: {
				update: { publishDate: null }
			}
		}
	});
};

export async function fetchS62aUnpublishCase(db: PrismaClient, id: string) {
	return await db.s62aCase.findUnique({
		where: { id }
	});
}

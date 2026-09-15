import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { AnswerValidationError } from '@pins/crowndev-lib/util/types.ts';

//Publish

export const publishCrownCase = (db: PrismaClient, id: string) => {
	return db.crownDevelopment.update({
		where: { id },
		data: {
			publishDate: new Date()
		}
	});
};

export async function fetchCrownPublishCase(db: PrismaClient, id: string) {
	return await db.crownDevelopment.findUnique({
		where: { id },
		include: {
			Lpa: { include: { Address: true } },
			SiteAddress: true
		}
	});
}

export type FetchedCrownDevelopment = Awaited<ReturnType<typeof fetchCrownPublishCase>>;

export function answerValidation(
	fetchedCase: NonNullable<FetchedCrownDevelopment>,
	id: string
): AnswerValidationError[] {
	return [
		{
			value: fetchedCase.description,
			errorMessage: 'Enter Development Description',
			pageLink: `/cases/${id}/overview/development-description`
		},
		{
			value: fetchedCase.typeId,
			errorMessage: 'Enter Application Type',
			pageLink: `/cases/${id}/overview/type-of-application`
		},
		{
			value: fetchedCase.Lpa?.id,
			errorMessage: 'Enter local planning authority',
			pageLink: `/cases/${id}/overview/local-planning-authority`
		},
		{
			value: fetchedCase.SiteAddress?.postcode || (fetchedCase.siteEasting && fetchedCase.siteNorthing),
			errorMessage: 'You must enter site coordinates or postcode within the site address',
			pageLink: `/cases/${id}#overview`
		}
	];
}

//Unpublish

export const unpublishCrownCase = (db: PrismaClient, id: string) => {
	return db.crownDevelopment.update({
		where: { id },
		data: {
			publishDate: null
		}
	});
};

export async function fetchCrownUnpublishCase(db: PrismaClient, id: string) {
	return await db.crownDevelopment.findUnique({
		where: { id }
	});
}

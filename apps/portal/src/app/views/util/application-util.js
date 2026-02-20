import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @typedef {{start: Date, end: Date}} HaveYourSayPeriod
 */

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('@pins/crowndev-database').PrismaClient} db
 * @returns {Promise<undefined|{id: string, reference: string, haveYourSayPeriod: HaveYourSayPeriod}>}
 */
export async function checkApplicationPublished(req, res, db) {
	const id = req.params?.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		notFoundHandler(req, res);
		return;
	}

	// only fetch case if published
	const crownDevelopment = await fetchPublishedApplication({
		db,
		id,
		args: {
			select: {
				reference: true,
				representationsPeriodStartDate: true,
				representationsPeriodEndDate: true,
				representationsPublishDate: true,
				containsDistressingContent: true
			}
		}
	});

	if (!crownDevelopment) {
		notFoundHandler(req, res);
		return;
	}
	return {
		id,
		reference: crownDevelopment.reference,
		haveYourSayPeriod: {
			start: crownDevelopment.representationsPeriodStartDate,
			end: crownDevelopment.representationsPeriodEndDate
		},
		representationsPublishDate: crownDevelopment.representationsPublishDate,
		withdrawnDate: crownDevelopment.withdrawnDate,
		applicationStatus: crownDevelopment.applicationStatus,
		containsDistressingContent: crownDevelopment.containsDistressingContent
	};
}

export async function shouldDisplayApplicationUpdatesLink(db, id) {
	const publishedAppUpdatesCount = await db.applicationUpdate.count({
		where: {
			applicationId: id,
			statusId: APPLICATION_UPDATE_STATUS_ID.PUBLISHED
		}
	});
	return publishedAppUpdatesCount > 0;
}

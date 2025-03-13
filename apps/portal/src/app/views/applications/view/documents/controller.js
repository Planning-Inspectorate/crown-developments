import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/name.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { mapDriveItemToViewModel } from './view-model.js';
import { applicationLinks } from '../view-model.js';
import { sortByField } from '@pins/crowndev-lib/util/array.js';
import { forwardStreamContents, getDocuments } from '../../../util/documents-util.js';

const PUBLISHED_FOLDER = 'Published';

/**
 * Render the list of documents page
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @returns {import('express').Handler}
 */
export function buildApplicationDocumentsPage({ db, logger, sharePointDrive }) {
	return async (req, res) => {
		const crownDevelopment = await checkApplicationPublished(req, res, db);
		if (!crownDevelopment) {
			return; // handled by checkApplicationPublished
		}
		const { id, reference, haveYourSayPeriod, representationsPublishDate } = crownDevelopment;
		const folderPath = caseReferenceToFolderName(reference) + '/' + PUBLISHED_FOLDER;
		logger.info({ folderPath }, 'view documents');
		const items = await getDocuments(sharePointDrive, folderPath, logger, id);
		// sort by newest first
		items.sort(sortByField('lastModifiedDateTime', true));
		const documents = items.map(mapDriveItemToViewModel).filter(Boolean);

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl: req.baseUrl,
			pageTitle: 'Documents',
			pageCaption: reference,
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: req.originalUrl,
			documents
		});
	};
}

/**
 * Render a document
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @param {global.fetch} [opts.fetchImpl] - for testing
 * @returns {import('express').Handler}
 */
export function buildDocumentView({ db, logger, sharePointDrive, fetchImpl }) {
	return async (req, res) => {
		const documentId = req.params?.documentId;
		if (!documentId) {
			throw new Error('documentId param is required');
		}

		const crownDevelopment = await checkApplicationPublished(req, res, db);
		if (!crownDevelopment) {
			return; // handled by checkApplicationPublished
		}
		const { reference } = crownDevelopment;

		logger.debug({ reference, documentId }, 'download file');

		const downloadUrl = await sharePointDrive.getDriveItemDownloadUrl(documentId);
		await forwardStreamContents(downloadUrl, req, res, logger, documentId, fetchImpl);
	};
}

/**
 * @typedef {{start: Date, end: Date}} HaveYourSayPeriod
 */

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('@prisma/client').PrismaClient} db
 * @returns {Promise<undefined|{id: string, reference: string, haveYourSayPeriod: HaveYourSayPeriod}>}
 */
async function checkApplicationPublished(req, res, db) {
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
				representationsPublishDate: true
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
		representationsPublishDate: crownDevelopment.representationsPublishDate
	};
}

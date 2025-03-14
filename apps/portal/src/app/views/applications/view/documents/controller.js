import { mapDriveItemToViewModel } from './view-model.js';
import { applicationLinks } from '../view-model.js';
import { sortByField } from '@pins/crowndev-lib/util/array.js';
import { getDocuments } from '../../../util/documents-util.js';
import { checkApplicationPublished } from '../../../util/application-util.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/sharepoint-path.js';

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

import { applicationLinks } from '../view-model.js';
import { sortByField } from '@pins/crowndev-lib/util/array.js';
import { checkApplicationPublished } from '../../../util/application-util.js';
import { publishedFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments } from '@pins/crowndev-lib/documents/get.js';

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
		const folderPath = publishedFolderPath(reference);
		logger.info({ folderPath }, 'view documents');
		const documents = await getDocuments({
			sharePointDrive,
			folderPath,
			logger,
			id,
			sortFn: sortByField('lastModifiedDateTime', true)
		});

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

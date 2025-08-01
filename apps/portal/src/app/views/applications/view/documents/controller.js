import { applicationLinks } from '../view-model.js';
import { sortByField } from '@pins/crowndev-lib/util/array.js';
import { checkApplicationPublished } from '../../../util/application-util.js';
import { publishedFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments } from '@pins/crowndev-lib/documents/get.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

/**
 * Render the list of documents page
 *
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildApplicationDocumentsPage(service) {
	const { db, logger, sharePointDrive } = service;
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
		const totalDocuments = documents.length;

		if ([null, undefined].includes(totalDocuments) || Number.isNaN(totalDocuments)) {
			return notFoundHandler(req, res);
		}

		const selectedItemsPerPage = Number(req.query?.itemsPerPage) || 25;
		const pageNumber = Math.max(1, Number(req.query?.page) || 1);
		const pageSize = [25, 50, 100].includes(selectedItemsPerPage) ? selectedItemsPerPage : 100;
		const skipSize = (pageNumber - 1) * pageSize;
		const totalPages = Math.ceil(totalDocuments / pageSize);
		const resultsStartNumber = Math.min((pageNumber - 1) * selectedItemsPerPage + 1, totalDocuments);
		const resultsEndNumber = Math.min(pageNumber * selectedItemsPerPage, totalDocuments);
		const currentUrl = `${req.baseUrl}/documents`;

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl: req.baseUrl,
			pageTitle: 'Documents',
			applicationReference: crownDevelopment.reference,
			pageCaption: reference,
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl,
			documents: documents.slice(skipSize, skipSize + pageSize),
			selectedItemsPerPage,
			totalDocuments,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber
		});
	};
}

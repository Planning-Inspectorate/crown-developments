import { applicationLinks } from '../view-model.js';
import { sortByField } from '@pins/crowndev-lib/util/array.js';
import { checkApplicationPublished } from '../../../util/application-util.js';
import { publishedFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments } from '@pins/crowndev-lib/documents/get.js';
import { splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';

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

		let allDocuments = await getDocuments({
			sharePointDrive,
			folderPath,
			logger,
			id,
			sortFn: sortByField('lastModifiedDateTime', true)
		});

		const queries = splitStringQueries(req.query?.searchCriteria);
		if (queries && queries.length > 0) {
			allDocuments = allDocuments.filter((document) =>
				queries.every((query) => document.name.trim().toLowerCase().includes(query.trim().toLowerCase()))
			);
		}
		const totalDocuments = allDocuments.length;

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalDocuments,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const currentUrl = `${req.baseUrl}/documents`;

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl: req.baseUrl,
			pageTitle: 'Documents',
			applicationReference: crownDevelopment.reference,
			pageCaption: reference,
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl,
			documents: allDocuments.slice(skipSize, skipSize + pageSize),
			selectedItemsPerPage,
			totalDocuments,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			searchValue: req.query?.searchCriteria || ''
		});
	};
}

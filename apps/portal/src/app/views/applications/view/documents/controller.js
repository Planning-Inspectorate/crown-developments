import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/name.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { mapDriveItemToViewModel } from './view-model.js';
import { applicationLinks } from '../view-model.js';
import { sortByField } from '@pins/crowndev-lib/util/array.js';

const PUBLISHED_FOLDER = 'Published';

// file properties to fetch for display
const FILE_PROPERTIES = Object.freeze(['file', 'id', 'lastModifiedDateTime', 'name', 'size']);

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
		const { id, reference } = crownDevelopment;
		const folderPath = caseReferenceToFolderName(reference) + '/' + PUBLISHED_FOLDER;
		logger.info({ folderPath }, 'view documents');
		const items = await getDocuments(sharePointDrive, folderPath, logger, id);
		// sort into newest first
		items.sort(sortByField('lastModifiedDateTime', true));
		const documents = items.map(mapDriveItemToViewModel);

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl: req.baseUrl,
			pageTitle: 'Documents',
			pageCaption: reference,
			links: applicationLinks(id),
			currentUrl: req.originalUrl,
			documents
		});
	};
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('@prisma/client').PrismaClient} db
 * @returns {Promise<undefined|{id: string, reference: string}>}
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
			select: { reference: true }
		}
	});

	if (!crownDevelopment) {
		notFoundHandler(req, res);
		return;
	}
	return {
		id,
		reference: crownDevelopment.reference
	};
}

/**
 * Wrap the sharepoint call to catch SharePoint errors and throw a user-friendly error
 *
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} sharePointDrive
 * @param {string} path
 * @param {import('pino').BaseLogger} logger
 * @param {string} id
 * @returns {Promise<DriveItemByPathResponse>}
 */
async function getDocuments(sharePointDrive, path, logger, id) {
	try {
		return await sharePointDrive.getItemsByPath(path, [['$select', FILE_PROPERTIES.join(',')]]);
	} catch (err) {
		// don't show SharePoint errors to the user
		logger.error({ err, id }, 'error fetching documents from sharepoint');
		throw new Error('There is a problem fetching documents');
	}
}

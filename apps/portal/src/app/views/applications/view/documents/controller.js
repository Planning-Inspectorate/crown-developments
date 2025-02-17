import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { getCurrentDate } from '@pins/crowndev-lib/util/date.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/name.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { mapDriveItemToViewModel } from './view-model.js';

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
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
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
			return notFoundHandler(req, res);
		}
		const folderPath = caseReferenceToFolderName(crownDevelopment.reference) + '/' + PUBLISHED_FOLDER;
		logger.info({ folderPath }, 'view documents');
		let documents = [];
		try {
			const items = await sharePointDrive.getItemsByPath(folderPath, [['$select', FILE_PROPERTIES.join(',')]]);
			documents = items.map(mapDriveItemToViewModel);
		} catch (err) {
			// don't show SharePoint errors to the user
			logger.error({ err, id }, 'error fetching documents from sharepoint');
			throw new Error('There is a problem fetching documents');
		}

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl: req.baseUrl,
			pageTitle: 'Placeholder for Documents page',
			documents
		});
	};
}

/**
 * Render a document
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {() => Date} [opts.getNow] - for testing
 * @returns {import('express').Handler}
 */
export function buildDocumentView({ db, getNow = getCurrentDate }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		// check case is published
		const now = getNow();
		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id, publishDate: { lte: now } },
			select: {}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		res.render('views/applications/view/documents/view.njk', {
			id,
			pageTitle: 'Placeholder for Documents page'
		});
	};
}

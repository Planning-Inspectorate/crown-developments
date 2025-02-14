import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { Readable } from 'stream';

const FOLDER = 'File Stream Test';

const FILE_PROPERTIES = Object.freeze(['file', 'id', 'lastModifiedDateTime', 'name', 'size']);

/**
 * @param {Object} opts
 * @param {import('pino').BaseLogger} opts.logger
 * @param {function(session): SharePointDrive | null} opts.getSharePointDrive
 * @returns {import('express').Handler}
 */
export function buildFilesView({ logger, getSharePointDrive }) {
	return async (req, res) => {
		logger.info('view files');
		const sharePointClient = getSharePointDrive(req.session);

		const items = await sharePointClient.getItemsByPath(FOLDER, [['$select', FILE_PROPERTIES.join(',')]]);

		const documents = items.map((i) => {
			return {
				id: i.id,
				name: i.name,
				size: i.size && bytesToUnit(i.size),
				lastModified: formatDateForDisplay(i.lastModifiedDateTime),
				type: i.file?.mimeType
			};
		});

		res.render('views/files/view.njk', {
			documents: documents
		});
	};
}

/**
 * @param {Object} opts
 * @param {import('pino').BaseLogger} opts.logger
 * @param {function(session): SharePointDrive | null} opts.getSharePointDrive
 * @returns {import('express').Handler}
 */
export function buildFileDownload({ logger, getSharePointDrive }) {
	return async (req, res) => {
		const itemId = req.params.itemId;
		if (!itemId) {
			throw new Error('itemId param is required');
		}
		// todo: verify the file is in a 'Published' folder for a case
		logger.info({ itemId }, 'download file');
		const sharePointClient = getSharePointDrive(req.session);

		const item = await sharePointClient.getDriveItem(itemId, [
			// content.downloadUrl gets the @microsoft.graph.downloadUrl - for some reason! https://stackoverflow.com/a/45508042
			['$select', 'content.downloadUrl']
		]);
		const downloadUrl = item['@microsoft.graph.downloadUrl'];
		if (!downloadUrl) {
			throw new Error('no download url returned from Graph');
		}

		// set up an abort controller to cancel requests
		const controller = new AbortController();

		const downloadRes = await fetch(downloadUrl, {
			signal: controller.signal
		});

		// abort downloads if the incoming request is closed
		req.on('close', () => {
			logger.debug({ itemId }, 'request closed, aborting download');
			controller.abort();
		});

		res.header('Content-Type', downloadRes.headers.get('Content-Type'));
		res.header('Content-Length', downloadRes.headers.get('Content-Length'));
		// allow PDFs to be viewed in-broswer
		if (!downloadRes.headers.get('Content-Type')?.includes('/pdf')) {
			res.header('Content-disposition', downloadRes.headers.get('Content-disposition'));
		}

		const downloadStream = Readable.fromWeb(downloadRes.body);
		// make sure to catch abort errors
		downloadStream.on('error', (err) => {
			if (err?.name === 'AbortError') {
				logger.debug({ itemId }, 'file download cancelled');
			} else {
				logger.error({ err, itemId }, 'file download stream error');
			}
		});
		// forward the contents of the file to the response
		downloadStream.pipe(res);
	};
}

const K_UNIT = 1024;
const SIZES = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * @param {number} bytes
 * @param {number} [decimalPoints]
 * @returns {string}
 */
export function bytesToUnit(bytes, decimalPoints = 1) {
	if (bytes === 0) return '0 Byte';

	const i = Math.floor(Math.log(bytes) / Math.log(K_UNIT));

	return parseFloat((bytes / Math.pow(K_UNIT, i)).toFixed(decimalPoints)) + ' ' + SIZES[i];
}

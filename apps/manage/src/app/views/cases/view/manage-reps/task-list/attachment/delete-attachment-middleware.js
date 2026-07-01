import { safeDeleteUploadedFilesSession } from '../../review/controller.js';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';

export function buildDeleteRepresentationRedactedDocumentMiddleware(journeyId) {
	return async (req, res, next) => {
		if (journeyId === 'manage-reps-manage') {
			const { representationRef, itemId, documentId } = getStringParams(req.params, [
				'representationRef',
				'itemId',
				'documentId'
			]);

			safeDeleteUploadedFilesSession(req, representationRef, itemId);
			req.session?.itemsToBeDeleted?.[representationRef]?.push(documentId);

			return res.redirect(req.baseUrl + '/redact');
		}
		return next();
	};
}

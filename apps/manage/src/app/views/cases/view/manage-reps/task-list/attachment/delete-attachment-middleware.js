import { safeDeleteUploadedFilesSession } from '../../review/controller.js';

export function buildDeleteRepresentationRedactedDocumentMiddleware(journeyId) {
	return async (req, res, next) => {
		if (journeyId === 'manage-reps-manage') {
			const params = req.params;
			const representationRef = params.representationRef;
			if (!representationRef) {
				throw new Error('representationRef param not found');
			}
			const itemId = params.itemId;
			if (!itemId) {
				throw new Error('itemId param not found');
			}
			const documentId = params.documentId;
			if (!documentId) {
				throw new Error('documentId param not found');
			}

			safeDeleteUploadedFilesSession(req, representationRef, itemId);
			req.session?.itemsToBeDeleted?.[representationRef]?.push(params.documentId);

			return res.redirect(req.baseUrl + '/redact');
		}
		return next();
	};
}

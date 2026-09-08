import type { ManageService } from '#service';
import { getRepresentationValidationErrors } from '@pins/crowndev-lib/forms/representations/validation-utils.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';

/**
 * Validate a representation before it can be accepted, rejected or redacted
 */
export function buildValidateRepresentationMiddleware(service: ManageService): AsyncRequestHandler {
	return async (req, res, next) => {
		const { db, logger } = service;
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

		logger.info({ representationReference: representationRef }, 'validate representation');
		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			include: {
				SubmittedByContact: true,
				RepresentedContacts: true
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const originUrl = `/s62a/cases/${id}/manage-representations/${representationRef}`;
		const errors = getRepresentationValidationErrors(representation, originUrl).filter((value) => value !== undefined);

		if (errors.length > 0) {
			addSessionData(req, representationRef, { errors }, 'representations');
			return res.redirect(req.baseUrl);
		}

		if (next) return next();
	};
}

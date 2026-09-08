import type { Request, Response } from 'express';
import { renderRepresentation } from '../view/controller.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';

export async function viewRepresentationAwaitingReview(req: Request, res: Response) {
	getStringParams(req.params, ['id', 'representationRef']);

	await renderRepresentation(req, res);
}

export function buildReviewRepresentation(): AsyncRequestHandler {
	return async (req, res) => {
		const body = (req.body ?? {}) as {
			errors?: Record<string, unknown>;
			errorSummary?: unknown[];
		};

		const errors = body.errors ?? {};
		const errorSummary = body.errorSummary ?? [];

		if (Object.keys(errors).length > 0) {
			await renderRepresentation(req, res, { errors, errorSummary });
			return;
		}

		res.redirect(req.baseUrl + '/task-list');
	};
}

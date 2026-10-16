import { Router as createRouter } from 'express';
import { buildSubmitUnpublishCase, type OnUnpublishSuccess } from './controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type { BaseService } from '@planning-inspectorate/core/app';
import type { PublishOperation, UnpublishCaseFetcher, CaseActionHook } from '../util/types.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

export function createRoutes<TService extends BaseService<PrismaClient> = BaseService<PrismaClient>>(
	service: TService,
	unpublishCaseFunction: PublishOperation,
	caseCheckFunction: UnpublishCaseFetcher,
	onUnpublishSuccess?: OnUnpublishSuccess,
	onUnpublished?: CaseActionHook
) {
	const router = createRouter({ mergeParams: true });

	const unpublishController = buildSubmitUnpublishCase(
		service,
		unpublishCaseFunction,
		caseCheckFunction,
		onUnpublishSuccess,
		onUnpublished
	);

	router.get('/', asyncHandler(unpublishController));
	return router;
}

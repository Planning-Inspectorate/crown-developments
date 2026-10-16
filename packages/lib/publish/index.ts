import type { BaseService } from '@planning-inspectorate/core/app';
import { Router as createRouter } from 'express';
import { buildGetValidatedCaseMiddleware, buildPublishCase } from './controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type {
	JourneyMiddlewareType,
	CaseFetcher,
	PublishOperation,
	ValidationRuleBuilder,
	CaseActionHook
} from '../util/types.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

export function createRoutes<T, TService extends BaseService<PrismaClient> = BaseService<PrismaClient>>(
	service: TService,
	journeyMiddlewareFunction: JourneyMiddlewareType<TService>,
	publishCaseFunction: PublishOperation,
	fetchedCase: CaseFetcher<T>,
	answerValidation: ValidationRuleBuilder<T>,
	onPublished?: CaseActionHook
) {
	const router = createRouter({ mergeParams: true });
	const publishController = buildPublishCase(service, publishCaseFunction, undefined, onPublished);
	const getCaseMiddleware = buildGetValidatedCaseMiddleware(service, fetchedCase, answerValidation);
	const getJourney = asyncHandler(journeyMiddlewareFunction(service, false));
	router.get('/', getJourney, getCaseMiddleware, asyncHandler(publishController));
	return router;
}

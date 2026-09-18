import { Router as createRouter } from 'express';
import { buildGetValidatedCaseMiddleware, buildPublishCase } from './controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type {
	JourneyMiddlewareType,
	CaseFetcher,
	PublishOperation,
	ValidationRuleBuilder,
	CaseService
} from '../util/types.ts';

export function createRoutes<T>(
	service: CaseService,
	journeyMiddlewareFunction: JourneyMiddlewareType,
	publishCaseFunction: PublishOperation,
	fetchedCase: CaseFetcher<T>,
	answerValidation: ValidationRuleBuilder<T>
) {
	const router = createRouter({ mergeParams: true });
	const publishController = buildPublishCase(service, publishCaseFunction);
	const getCaseMiddleware = buildGetValidatedCaseMiddleware(service, fetchedCase, answerValidation);
	const getJourney = asyncHandler(journeyMiddlewareFunction(service, false));
	router.get('/', getJourney, getCaseMiddleware, asyncHandler(publishController));
	return router;
}

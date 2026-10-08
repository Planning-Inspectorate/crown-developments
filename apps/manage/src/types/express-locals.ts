import type { Journey, JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';

/**
 * Fields set on res.locals by shared/common middleware, available on (almost) every route.
 * Flow-specific controllers should extend this with their own `journeyResponse`/`originalAnswers` shape
 * and use `AsyncRequestHandlerWithLocals<TheirLocals>` rather than relying on the global `Locals` type.
 */
export interface BaseLocals extends Record<string, unknown> {
	journey?: Journey;
	journeyResponse?: JourneyResponseLike<Record<string, unknown>>;
	originalAnswers?: Record<string, unknown>;
	backLinkUrl?: string;
	errorSummary?: ErrorSummaryItem[];
	config?: Record<string, unknown>;
	cspNonce?: string;
	styleCss?: string;
}

declare module 'express-serve-static-core' {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- we want to be able to import BaseLocals in files
	interface Locals extends BaseLocals {}
}

import type { Journey, JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import type { AuditService } from '@pins/crowndev-lib/audit/service.ts';
import type { BaseLocals } from '@pins/crowndev-lib/types/express-locals.ts';
import type { S62aCaseAnswers } from './view-model.ts';

/**
 * Locals set by `buildGetJourneyMiddleware` for the s62a case view journey.
 */
export interface S62aCaseViewLocals extends BaseLocals {
	journey: Journey;
	journeyResponse: JourneyResponseLike<S62aCaseAnswers>;
	originalAnswers?: S62aCaseAnswers;
	preApplicationCaseReferences?: ReadonlyMap<string, string>;
	fieldDisplayNames?: Record<string, string>;
	userDisplayNameMap?: Map<string, string>;
	createdDateFormatted?: string | null;
	lastModified?: Awaited<ReturnType<AuditService['getLastModifiedInfo']>>;
}

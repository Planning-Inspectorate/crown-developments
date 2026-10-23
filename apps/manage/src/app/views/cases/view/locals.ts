import type { Journey, JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import type { AuditService } from '@pins/crowndev-lib/audit/service.ts';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import type { mapNotes } from '@pins/crowndev-lib/case-notes/controller.ts';
import type { BaseLocals } from '@pins/crowndev-lib/types/express-locals.ts';
import type { CrownDevelopmentAnswers } from './view-model.ts';

/**
 * Locals specific to the case view/journey-middleware pair, on top of the shared `BaseLocals`.
 * Required fields are guaranteed after `buildGetJourneyMiddleware` completes successfully.
 */
export interface CaseViewLocals extends BaseLocals {
	journey: Journey;
	journeyResponse: JourneyResponseLike<CrownDevelopmentAnswers>;
	originalAnswers: CrownDevelopmentAnswers;
	groupMembers: EntraGroupMembers;
	caseNotes?: ReturnType<typeof mapNotes>['caseNotes'];
	allCaseNotesCount?: number;
	lastModified: Awaited<ReturnType<AuditService['getLastModifiedInfo']>>;
}

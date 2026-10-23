import type { Journey, JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import type { BaseLocals } from '@pins/crowndev-lib/types/express-locals.ts';
import type { S62aCreateCaseAnswers } from './s62a-case-mapper.ts';

/**
 * Locals set by `buildGetJourneyMiddleware` for the s62a create-a-case journey.
 */
export interface S62aCreateCaseLocals extends BaseLocals {
	journey: Journey;
	journeyResponse: JourneyResponseLike<Partial<S62aCreateCaseAnswers>>;
}

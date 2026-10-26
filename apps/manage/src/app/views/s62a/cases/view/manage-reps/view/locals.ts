import type { Journey, JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import type { HaveYourSayManageAnswers } from '@pins/crowndev-lib/forms/representations/types.d.ts';
import type { BaseLocals } from '@pins/crowndev-lib/types/express-locals.ts';

/**
 * Locals set by `buildGetJourneyMiddleware` for the representation view/manage journey.
 */
export interface RepresentationViewLocals extends BaseLocals {
	journey: Journey;
	journeyResponse: JourneyResponseLike<HaveYourSayManageAnswers>;
	originalAnswers: HaveYourSayManageAnswers;
	fieldDisplayNames: Record<string, string>;
}

import type { JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';
import type { BaseLocals } from '@pins/crowndev-lib/types/express-locals.ts';

export interface MoveFileJourneyAnswers extends Record<string, unknown> {
	fileLocation?: string | null;
}

export interface MoveFileJourneyLocals extends BaseLocals {
	journeyResponse: JourneyResponseLike<MoveFileJourneyAnswers>;
}

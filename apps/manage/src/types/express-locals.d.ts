import type { Journey } from '@planning-inspectorate/dynamic-forms';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types';
import type { CrownDevelopmentViewModel, CrownJourneyAnswers } from '../app/views/cases/view/types.d.ts';

type CrownJourneyResponse = {
	journeyId: string;
	referenceId: string;
	answers: CrownJourneyAnswers;
	// Not used in Crown Developments but required by the JourneyResponse constructor
	// TODO remove once no longer marked required in dynamic-forms
	LPACode: string | undefined;
};

declare global {
	namespace Express {
		interface Locals {
			journeyResponse: CrownJourneyResponse;
			journey?: Journey;
			originalAnswers?: CrownDevelopmentViewModel;
			backLinkUrl?: string;
			errorSummary?: ErrorSummaryItem[];
			config?: Record<string, unknown>;
			cspNonce?: string;
			styleCss?: string;
		}
	}
}

export {};

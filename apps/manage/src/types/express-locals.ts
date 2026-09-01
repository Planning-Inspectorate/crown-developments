import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import type { Journey } from '@planning-inspectorate/dynamic-forms';
import type { CrownDevelopmentViewModel, mapNotes } from '../app/views/cases/view/view-model.ts';

export type CrownJourneyResponse = {
	journeyId: string;
	referenceId: string;
	answers: CrownDevelopmentViewModel;
	// Not used in Crown Developments but required by the JourneyResponse constructor
	// TODO remove once no longer marked required in dynamic-forms
	LPACode: string | undefined;
};

declare module 'express-serve-static-core' {
	interface Locals {
		journeyResponse: CrownJourneyResponse;
		journey?: Journey;
		originalAnswers?: CrownDevelopmentViewModel;
		backLinkUrl?: string;
		errorSummary?: ErrorSummaryItem[];
		config?: Record<string, unknown>;
		cspNonce?: string;
		styleCss?: string;
		caseNotes?: ReturnType<typeof mapNotes>['caseNotes'];
		allCaseNotesCount?: number;
	}
}

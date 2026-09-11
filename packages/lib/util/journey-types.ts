import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

/**
 * A journey response with strongly-typed answers.
 * Use this to bridge dynamic-forms' generic JourneyResponse with app-specific view models.
 */
export interface TypedJourneyResponse<TAnswers> {
	journeyId: string;
	referenceId: string;
	answers: TAnswers;
	LPACode: string | undefined;
}

/**
 * Callback signature for buildGetJourney that receives a typed journey response.
 * The TJourney type parameter allows this to work with any Journey class instance.
 */
export type TypedJourneyCallback<TAnswers, TJourney> = (
	req: Request,
	journeyResponse: TypedJourneyResponse<TAnswers>
) => TJourney;

/**
 * Wraps a typed journey callback to be compatible with buildGetJourney from dynamic-forms.
 *
 * This is the single point where the type bridge between dynamic-forms' generic
 * JourneyResponse and app-specific typed view models happens.
 *
 * @example
 * ```ts
 * const callback = withTypedAnswers<CrownDevelopmentViewModel>((req, journeyResponse) => {
 *   // journeyResponse.answers is typed as CrownDevelopmentViewModel
 *   const questions = getQuestions(journeyResponse);
 *   return createJourney(questions, journeyResponse, req);
 * });
 *
 * const getJourney = buildGetJourney(callback);
 * ```
 */
export function withTypedAnswers<TAnswers, TJourney>(
	callback: TypedJourneyCallback<TAnswers, TJourney>
): (req: Request, journeyResponse: JourneyResponse) => TJourney {
	return (req: Request, journeyResponse: JourneyResponse): TJourney => {
		return callback(req, journeyResponse as unknown as TypedJourneyResponse<TAnswers>);
	};
}

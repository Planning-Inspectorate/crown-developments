import type { Response } from 'express';
import type { JourneyResponseLike } from '@planning-inspectorate/dynamic-forms';

/**
 * Retrieves the answers object from the journey response in the
 * Express response object, typed with the generic type T.
 */
export function getAnswers<T>(res: Response): T {
	if (!res.locals || !res.locals.journeyResponse) {
		throw new Error('journey response required');
	}

	const journeyResponse = res.locals.journeyResponse as JourneyResponseLike<T>;
	const answers = journeyResponse.answers;

	if (typeof answers !== 'object') {
		throw new Error('answers should be an object');
	}

	return answers;
}

/**
 * Retrieves the answers object from the journey response in the
 * Express response object, typed with the generic type T.
 */
export function getOptionalAnswers<T>(res: Response): T | undefined {
	if (!res.locals || !res.locals.journeyResponse) {
		return undefined;
	}

	const journeyResponse = res.locals.journeyResponse as JourneyResponseLike<T>;
	return journeyResponse.answers ?? undefined;
}

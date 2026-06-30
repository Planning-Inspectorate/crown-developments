import type { Handler } from 'express';
import type { Request } from 'express';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';

const MAX_COMMENT_LENGTH = 500;

export function buildValidateCaseNotesMiddleware(): Handler {
	return (req, res, next) => {
		const id = getStringParam(req.params, 'id');

		if (!id) {
			throw new Error('id param required');
		}

		const errors = generateCaseNoteErrors(req);
		if (errors.length) {
			addSessionData(req, id, { updateErrors: errors }, 'cases');

			return res.redirect(`/cases/${id}`);
		}

		next();
	};
}

function generateCaseNoteErrors(req: Request): ErrorSummaryItem[] {
	const { comment } = req.body as { comment?: unknown };
	const errors: (ErrorSummaryItem | undefined)[] = [];

	errors.push(checkRequiredAnswer(comment, 'Enter a case note', req.baseUrl));
	errors.push(
		checkAnswerLength(
			comment,
			`Case note must be ${MAX_COMMENT_LENGTH} characters or less`,
			req.baseUrl,
			MAX_COMMENT_LENGTH
		)
	);

	return errors.filter((error): error is ErrorSummaryItem => error !== undefined);
}

function checkRequiredAnswer(value: unknown, errorMessage: string, pageLink: string): ErrorSummaryItem | undefined {
	if (typeof value === 'undefined' || value === '' || value === null) {
		return { text: errorMessage, href: pageLink };
	}
}

function checkAnswerLength(
	value: unknown,
	errorMessage: string,
	pageLink: string,
	maxLength: number
): ErrorSummaryItem | undefined {
	if (typeof value === 'string' && value.length > maxLength) {
		return { text: errorMessage, href: pageLink };
	}
}

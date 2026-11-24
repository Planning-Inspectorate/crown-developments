import type { Request, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { VIEW_TAB_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

type ErrorSummaryItem = { text: string; href: string };

/** The parts of express-validator's validation error and result used here */
interface FieldValidationError {
	msg: unknown;
	path?: string;
}

interface ValidationResultLike {
	isEmpty(): boolean;
	array(): FieldValidationError[];
	mapped(): Record<string, FieldValidationError>;
}

type Validate = (req: Request) => ValidationResultLike;

const defaultValidate = validationResult as unknown as Validate;

/**
 * A piece of data that must be added (on another page) before a question can be saved,
 * with the error message shown and the page it links to.
 */
export interface Prerequisite {
	message: string;
	/** Path of the page where the data is added, relative to the case URL (/s62a/cases/:id) */
	path: string;
}

/**
 * Prerequisites for the "When is the hearing date?" page (PEAS hearing notification).
 * Order matches the order the errors are shown in.
 */
export const HEARING_DATE_PREREQUISITES = Object.freeze({
	siteLocation: {
		message: 'Add the site address or site coordinates before you add the hearing date',
		path: `${VIEW_TAB_ID.OVERVIEW}/overview/site-address`
	},
	inspector: {
		message: 'Add the appointed inspector before you add the hearing date',
		path: `${VIEW_TAB_ID.CASE_TEAM}/case-team/check-case-team-inspectors`
	},
	published: {
		message: 'Publish the case before you add the hearing date',
		// the Publish button is on the case page
		path: VIEW_TAB_ID.OVERVIEW
	},
	venue: {
		message: 'Add the hearing venue before you add the hearing date',
		path: `${VIEW_TAB_ID.EVENT}/event/hearing-venue`
	}
} satisfies Record<string, Prerequisite>);

const PREREQUISITES_BY_MESSAGE = new Map<string, Prerequisite>(
	Object.values(HEARING_DATE_PREREQUISITES).map((prerequisite) => [prerequisite.message, prerequisite])
);

/**
 * The case URL (/s62a/cases/:id) from a request handled by the case tab router (/s62a/cases/:id/:tab).
 */
function caseUrlFromRequest(req: Request): string {
	const tab = typeof req.params?.tab === 'string' ? req.params.tab : undefined;
	const baseUrl = req.baseUrl ?? '';
	return tab && baseUrl.endsWith(`/${tab}`) ? baseUrl.slice(0, -(tab.length + 1)) : baseUrl;
}

/**
 * Drop-in replacement for the dynamic-forms validationErrorHandler, for S62A case questions.
 *
 * Behaves the same for ordinary errors (one error per field, linking to the field), but
 * "prerequisite" errors (data that must be added on another page first) are:
 * - all listed in the error summary, even when several are attached to the same field
 *   (express-validator's mapped() only keeps the first error per field)
 * - linked to the page where that data is added, instead of the field on this page
 */
export function buildS62aValidationErrorHandler(validate: Validate = defaultValidate): RequestHandler {
	return (req, res, next) => {
		const result = validate(req);
		if (result.isEmpty()) {
			return next();
		}

		// some validators (e.g. dates) return empty messages to avoid one error per input, ignore those
		const allErrors = result.array().filter((error) => error.msg);
		if (allErrors.length === 0) {
			return next();
		}

		const mapped = Object.fromEntries(Object.entries(result.mapped()).filter(([, error]) => error.msg));
		const caseUrl = caseUrlFromRequest(req);

		const errorSummary: ErrorSummaryItem[] = [];
		const seenMessages = new Set<string>();

		for (const error of allErrors) {
			const text = String(error.msg);
			if (seenMessages.has(text)) continue;

			const prerequisite = PREREQUISITES_BY_MESSAGE.get(text);
			if (prerequisite) {
				seenMessages.add(text);
				errorSummary.push({ text, href: `${caseUrl}/${prerequisite.path}` });
				continue;
			}

			// ordinary error: only the first error per field, linking to the field (as dynamic-forms does)
			const path = error.path;
			if (path && mapped[path] === error) {
				seenMessages.add(text);
				errorSummary.push({ text, href: `#${path}` });
			}
		}

		const body = req.body as Record<string, unknown>;
		body.errors = mapped;
		body.errorSummary = errorSummary;
		return next();
	};
}

export const s62aValidationErrorHandler = buildS62aValidationErrorHandler();
